import test from "node:test"
import assert from "node:assert/strict"
import { createClient } from "@supabase/supabase-js"
import { createBarbershopAccount } from "../lib/admin/create-account.ts"
import {
  deleteAccount,
  findUnlinkedAccounts,
  listAllAuthUsers,
} from "../lib/admin/accounts.ts"

const actorId = "11111111-1111-4111-8111-111111111111"
const targetId = "22222222-2222-4222-8222-222222222222"
const shopId = "33333333-3333-4333-8333-333333333333"
const secondShopId = "44444444-4444-4444-8444-444444444444"
const otherMasterId = "55555555-5555-4555-8555-555555555555"
const authUser = (id) => ({
  id,
  email: `${id}@example.invalid`,
  aud: "authenticated",
  role: "authenticated",
  created_at: "2026-01-01T00:00:00Z",
  app_metadata: {},
  user_metadata: {},
})
const link = { user_id: targetId, barbershop_id: shopId }
const input = {
  actorId,
  userId: targetId,
  barbershopId: shopId,
  scope: "linked",
  confirmed: true,
}
const quiet = () => {}

// Use the real Supabase client against an isolated fake HTTP service. No real
// credentials, database connections, accounts, files or customer data are used.
function fixture(overrides = {}) {
  const state = {
    users: [authUser(targetId)],
    masters: [],
    links: [{ ...link }],
    cascade: true,
    authFails: false,
    lookupFails: false,
    cleanupFails: false,
    ...overrides,
  }
  const calls = []
  const json = (data, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: {
        "content-type": "application/json",
        "x-supabase-api-version": "2024-01-01",
      },
    })
  const fetch = async (rawUrl, options = {}) => {
    const url = new URL(rawUrl)
    const method = options.method || "GET"
    calls.push({
      method,
      path: url.pathname,
      query: url.searchParams,
      body: options.body ? JSON.parse(options.body) : null,
    })
    const match = (row) =>
      [...url.searchParams.entries()].every(
        ([key, value]) =>
          !value.startsWith("eq.") || String(row[key]) === value.slice(3),
      )
    if (
      url.pathname === "/rest/v1/rpc/prepare_account_deletion" &&
      method === "POST"
    ) {
      if (state.preparationFails)
        return json(
          { code: "23514", message: "Arquivos precisam de revisão." },
          400,
        )
      return json(0)
    }
    if (url.pathname.endsWith("/rest/v1/master_admins")) {
      if (state.lookupFails)
        return json({ code: "XX000", message: "lookup failed" }, 500)
      return json(state.masters.filter(match))
    }
    if (url.pathname.endsWith("/rest/v1/barbershop_members")) {
      if (method === "GET") return json(state.links.filter(match))
      if (method === "DELETE") {
        if (state.cleanupFails)
          return json({ code: "XX000", message: "cleanup failed" }, 500)
        state.links = state.links.filter((row) => !match(row))
        return new Response(null, { status: 204 })
      }
    }
    if (url.pathname === "/auth/v1/admin/users" && method === "GET") {
      const page = Number(url.searchParams.get("page"))
      const count = Number(url.searchParams.get("per_page"))
      return json({
        users: state.users.slice((page - 1) * count, page * count),
      })
    }
    if (
      url.pathname === `/auth/v1/admin/users/${targetId}` &&
      method === "DELETE"
    ) {
      if (state.authFails)
        return json(
          { code: "unexpected_failure", msg: "Database error deleting user" },
          500,
        )
      const user = state.users.find((row) => row.id === targetId)
      if (!user)
        return json({ code: "user_not_found", msg: "User not found" }, 404)
      state.users = state.users.filter((row) => row.id !== targetId)
      if (state.cascade)
        state.links = state.links.filter((row) => row.user_id !== targetId)
      return json({ user })
    }
    throw new Error(`Unexpected request: ${method} ${url.pathname}`)
  }
  const admin = createClient(
    "https://account-tests.supabase.invalid",
    "fake-service-key-for-local-tests",
    {
      global: { fetch },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  )
  return { admin, state, calls }
}

for (const [name, patch] of [
  ["unconfirmed deletion", { confirmed: false }],
  ["invalid account ID", { userId: "invalid" }],
  ["self deletion", { userId: actorId }],
  ["invalid scope", { scope: "all" }],
]) {
  test(`${name} never reaches the API`, async () => {
    const { admin, calls } = fixture()
    assert.equal(
      (await deleteAccount(admin, { ...input, ...patch }, quiet)).ok,
      false,
    )
    assert.equal(calls.length, 0)
  })
}

test("another master admin cannot be deleted", async () => {
  const { admin, calls, state } = fixture({ masters: [{ user_id: targetId }] })
  assert.equal(
    (await deleteAccount(admin, input, quiet)).code,
    "protected_account",
  )
  assert.equal(
    calls.some((call) => call.method === "DELETE"),
    false,
  )
  assert.equal(state.users.length, 1)
})

test("a failed protection lookup fails closed", async () => {
  const { admin, calls } = fixture({ lookupFails: true })
  assert.equal((await deleteAccount(admin, input, quiet)).code, "lookup_failed")
  assert.equal(
    calls.some((call) => call.method === "DELETE"),
    false,
  )
})

test("Auth failure preserves the membership that keeps the profile visible", async () => {
  const { admin, calls, state } = fixture({ authFails: true })
  assert.equal((await deleteAccount(admin, input, quiet)).code, "auth_failed")
  assert.deepEqual(state.links, [link])
  assert.equal(state.users.length, 1)
  assert.equal(
    calls.filter(
      (call) => call.method === "DELETE" && call.path.includes("/rest/"),
    ).length,
    0,
  )
})

test("successful deletion hard-deletes Auth before cleaning the exact membership", async () => {
  const { admin, calls, state } = fixture()
  assert.deepEqual(await deleteAccount(admin, input, quiet), { ok: true })
  const writes = calls.filter((call) => call.method === "DELETE")
  assert.equal(writes[0].path, `/auth/v1/admin/users/${targetId}`)
  assert.equal(writes[0].body.should_soft_delete, false)
  assert.equal(writes[1].query.get("user_id"), `eq.${targetId}`)
  assert.equal(writes[1].query.get("barbershop_id"), `eq.${shopId}`)
  assert.equal(state.users.length, 0)
  assert.equal(state.links.length, 0)
})

test("an unlinked Auth account can be explicitly deleted", async () => {
  const { admin, calls, state } = fixture({ links: [] })
  assert.deepEqual(
    await deleteAccount(
      admin,
      { ...input, barbershopId: null, scope: "unlinked" },
      quiet,
    ),
    { ok: true },
  )
  assert.equal(state.users.length, 0)
  assert.equal(calls.filter((call) => call.method === "DELETE").length, 1)
})

test("an account that gained a link after the page loaded cannot be deleted as unlinked", async () => {
  const { admin, calls } = fixture()
  assert.equal(
    (
      await deleteAccount(
        admin,
        { ...input, barbershopId: null, scope: "unlinked" },
        quiet,
      )
    ).code,
    "scope_changed",
  )
  assert.equal(
    calls.some((call) => call.method === "DELETE"),
    false,
  )
})

test("a stale or wrong shop selection cannot delete a user", async () => {
  const { admin, calls } = fixture()
  assert.equal(
    (
      await deleteAccount(
        admin,
        { ...input, barbershopId: secondShopId },
        quiet,
      )
    ).code,
    "scope_changed",
  )
  assert.equal(
    calls.some((call) => call.method === "DELETE"),
    false,
  )
})

test("users with other shop accesses are preserved", async () => {
  const { admin, calls } = fixture({
    links: [link, { ...link, barbershop_id: secondShopId }],
  })
  assert.equal(
    (await deleteAccount(admin, input, quiet)).code,
    "multiple_shops",
  )
  assert.equal(
    calls.some((call) => call.method === "DELETE"),
    false,
  )
})

test("membership cleanup can be retried after Auth is already gone", async () => {
  const { admin, state } = fixture({ cascade: false, cleanupFails: true })
  assert.equal(
    (await deleteAccount(admin, input, quiet)).code,
    "cleanup_failed",
  )
  assert.equal(state.users.length, 0)
  assert.equal(state.links.length, 1)
  state.cleanupFails = false
  assert.deepEqual(await deleteAccount(admin, input, quiet), { ok: true })
  assert.equal(state.links.length, 0)
})

test("unlinked accounts exclude all masters and current memberships", () => {
  const users = [actorId, otherMasterId, targetId, secondShopId].map(authUser)
  assert.deepEqual(
    findUnlinkedAccounts(
      users,
      [link],
      [{ user_id: otherMasterId }],
      actorId,
    ).map((user) => user.id),
    [secondShopId],
  )
  assert.deepEqual(findUnlinkedAccounts(users, null, [], actorId), [])
  assert.deepEqual(findUnlinkedAccounts(users, [], null, actorId), [])
})

test("Auth listing includes users after the first page", async () => {
  const users = Array.from({ length: 401 }, (_, index) =>
    authUser(`aaaa0000-aaaa-4aaa-8aaa-${String(index).padStart(12, "0")}`),
  )
  const { admin, calls } = fixture({ users })
  assert.equal((await listAllAuthUsers(admin)).length, 401)
  assert.equal(calls.length, 3)
})

test("a failure to preserve storage assets blocks Auth and membership deletion", async () => {
  const { admin, calls, state } = fixture({ preparationFails: true })
  assert.equal(
    (await deleteAccount(admin, input, quiet)).code,
    "preparation_failed",
  )
  assert.equal(
    calls.some((call) => call.method === "DELETE"),
    false,
  )
  assert.equal(state.users.length, 1)
  assert.deepEqual(state.links, [link])
})

test("storage preparation receives the verified master, target and shop scope", async () => {
  const { admin, calls } = fixture()
  await deleteAccount(admin, input, quiet)
  const prepIndex = calls.findIndex((call) =>
    call.path.endsWith("/rpc/prepare_account_deletion"),
  )
  const authIndex = calls.findIndex(
    (call) => call.path === `/auth/v1/admin/users/${targetId}`,
  )
  assert.ok(prepIndex >= 0 && prepIndex < authIndex)
  assert.deepEqual(calls[prepIndex].body, {
    p_actor_id: actorId,
    p_user_id: targetId,
    p_barbershop_id: shopId,
    p_scope: "linked",
  })
})

function registration({ missingShop = false, authCode, rejectLink = false, lostLinkResponse = false } = {}) {
  const form = new FormData()
  form.set("barber_name", "  João da Silva  ")
  form.set("email", "barber@example.com")
  form.set("password", " password with spaces ")
  form.set("barbershop_id", shopId)
  form.set("role", "staff")
  form.set("whatsapp_phone", "(81) 98765-4321")
  const calls = []
  let membership = null
  const json = (value, status = 200) =>
    new Response(JSON.stringify(value), {
      status,
      headers: { "content-type": "application/json", "x-supabase-api-version": "2024-01-01" },
    })
  const empty = () => new Response(null, { status: 204 })
  const admin = createClient("https://registration.example.invalid", "test-key", {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      fetch: async (request, options) => {
        const url = new URL(request)
        const method = options.method
        const body = options.body ? JSON.parse(options.body) : null
        calls.push({ method, path: url.pathname, search: url.searchParams, body })
        switch (`${method} ${url.pathname}`) {
          case "GET /rest/v1/barbershop_settings":
            return json(missingShop ? [] : [{ id: shopId }])
          case "POST /auth/v1/admin/users":
            return authCode ? json({ code: authCode, msg: "Auth rejected input" }, 422) : json(authUser(targetId))
          case "POST /rest/v1/barbers":
          case "PATCH /rest/v1/barbershop_settings":
          case "DELETE /rest/v1/barbers":
            return empty()
          case "POST /rest/v1/barbershop_members":
            if (rejectLink) return json({ code: "23503", message: "Invalid shop reference" }, 409)
            membership = body
            return lostLinkResponse ? json({ code: "PGRST000", message: "Connection lost" }, 500) : empty()
          case "GET /rest/v1/barbershop_members":
            return json(membership ? [{ user_id: membership.user_id }] : [])
          case `DELETE /auth/v1/admin/users/${targetId}`:
            return json(authUser(targetId))
          default:
            throw new Error(`Unexpected request: ${method} ${url.pathname}`)
        }
      },
    },
  })
  return { form, calls, run: () => createBarbershopAccount(admin, form, quiet) }
}

for (const role of ["staff", "owner"]) {
  test(`a new ${role} has a named barber record and membership in the selected shop`, async () => {
    const { form, calls, run } = registration()
    form.set("role", role)
    assert.deepEqual(await run(), { whatsappSaved: true })
    const [, auth, barber, member, shop] = calls
    assert.equal(auth.body.password, " password with spaces ")
    assert.deepEqual(barber.body, { id: barber.body.id, name: "João da Silva", barbershop_id: shopId })
    assert.deepEqual(member.body, { user_id: targetId, barbershop_id: shopId, role, barber_id: barber.body.id })
    assert.equal(shop.body.whatsapp_phone, "81987654321")
  })
}

test("a blank barber name or missing shop prevents Auth account creation", async () => {
  const blank = registration()
  blank.form.set("barber_name", " ")
  assert.match((await blank.run()).error, /nome do barbeiro/)
  assert.equal(blank.calls.length, 0)

  const missing = registration({ missingShop: true })
  assert.match((await missing.run()).error, /Selecione uma barbearia/)
  assert.deepEqual(missing.calls.map((call) => call.method), ["GET"])
})

test("a duplicate email is actionable and does not create an extra barber", async () => {
  const { calls, run } = registration({ authCode: "email_exists" })
  assert.match((await run()).error, /Contas sem vínculo/)
  assert.deepEqual(calls.map((call) => call.path), ["/rest/v1/barbershop_settings", "/auth/v1/admin/users"])
})

test("a failed membership undoes the new Auth user and only the new barber", async () => {
  const { calls, run } = registration({ rejectLink: true })
  assert.match((await run()).error, /cadastro foi desfeito/)
  const [, , barber, , authCleanup, barberCleanup] = calls
  assert.equal(authCleanup.path, `/auth/v1/admin/users/${targetId}`)
  assert.equal(authCleanup.method, "DELETE")
  assert.equal(barberCleanup.method, "DELETE")
  assert.equal(barberCleanup.search.get("id"), `eq.${barber.body.id}`)
  assert.equal(barberCleanup.search.get("barbershop_id"), `eq.${shopId}`)
})

test("an existing new membership survives a lost success response", async () => {
  const { calls, run } = registration({ lostLinkResponse: true })
  assert.deepEqual(await run(), { whatsappSaved: true })
  assert.equal(calls.some((call) => call.method === "DELETE"), false)
  assert.equal(calls[4].path, "/rest/v1/barbershop_members")
  assert.equal(calls[4].method, "GET")
})
