# Página comercial do Agenda Barber

A página `/` apresenta o produto, oferece uma simulação de agendamento e direciona interessados para uma apresentação.

## Conteúdo e contato

- Marca preservada: Agenda Barber, com vermelho, branco e tons escuros. As mesmas seções foram mantidas, com proporções, tipografia, espaçamento e enquadramentos revistos; as prévias permanecem retas.
- Contato atual: `https://www.instagram.com/marciosaantos/`, centralizado em `contactUrl` em `app/page.tsx`.
- Os valores de serviços na demonstração são fictícios e estão identificados como exemplos. Não são preços da assinatura.
- Mensalidade, duração de teste e condições comerciais dependem de definição do proprietário. A página orienta consultar as condições na apresentação.
- As prévias em `components/marketing/product-previews.tsx` usam a Barbearia Modelo, uma empresa fictícia. São componentes de apresentação, sem dados de empresas reais nem consultas ao banco. As capturas antigas foram removidas dos assets da versão atual.
- Não há depoimentos, estatísticas de resultados ou promessas de redução de faltas sem comprovação.

## Funcionamento

A simulação em `components/marketing/booking-demo.tsx` mantém seus dados apenas no estado do componente. Não importa clientes Supabase, não envia formulários nem cria reservas reais. O visitante escolhe um serviço, profissional e horário, visualiza um pedido ilustrativo no painel e pode reiniciar.

O proxy retorna diretamente para `/`, pois a página comercial não utiliza sessão nem dados privados. As demais rotas mantêm o fluxo de autenticação existente.

## Verificações

- `npm ci --no-audit --no-fund`
- `./node_modules/.bin/tsc --noEmit`
- `NEXT_TURBOPACK_EXPERIMENTAL_USE_SYSTEM_TLS_CERTS=1 npm run build`
- Revisão no navegador da página compilada, incluindo simulação com seleção alternativa, reinício e FAQ.
- Revisão em iframes de 390 e 320 px para conferir o layout de celular e o fluxo da demonstração.

O ambiente de revisão precisou usar os certificados TLS do sistema para baixar as fontes Google já utilizadas no projeto. A configuração do repositório não foi alterada por esse motivo. O comando de preview gerenciado injeta flags de Vite incompatíveis com Next.js; a revisão visual usou uma cópia estática da página compilada e seus assets. O login, o painel e o banco de produção não foram exercitados.

Captura da apresentação: [landing-preview.jpg](./landing-preview.jpg).
