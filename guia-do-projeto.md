# Sistema de pedidos para lanchonetes (multiloja)

Coloque este arquivo na raiz do projeto e peça ao Antigravity para ler antes de cada tarefa.
O banco já está pronto em `schema.sql`. Não recriar tabelas nem mudar nomes de colunas.

## O que é

Cada lanchonete tem um link próprio (`seusistema.com/lanchonete-do-ze`). O cliente abre pelo
celular, monta o pedido, escolhe entrega ou retirada e acompanha o andamento. A lanchonete
recebe tudo em um painel, em tempo real.

## Stack

- Next.js (App Router) com TypeScript. Motivo: o link é compartilhado no WhatsApp e no
  Instagram, então a página da loja precisa ter título, descrição e imagem de prévia corretos.
- Tailwind CSS.
- Supabase (Postgres, login da equipe e tempo real).
- Hospedagem: Vercel ou Netlify.

Segurança, sem exceção:
- Chave `service_role` nunca vai para o navegador nem para variável `NEXT_PUBLIC_`.
- O cliente nunca envia preço. Ele envia ids e quantidades; quem calcula é a função
  `criar_pedido` do banco.
- Cliente sem login só usa duas funções: `criar_pedido` e `acompanhar_pedido`.

## Rotas

Parte do cliente (sem login):
- `/[link]` cardápio da loja
- `/[link]/sacola` itens escolhidos
- `/[link]/finalizar` dados, entrega ou retirada, pagamento
- `/pedido/[codigo]` acompanhamento (o código é o `codigo_acompanhamento`)

Painel da lanchonete (com login):
- `/painel/entrar`
- `/painel/pedidos` pedidos em tempo real, com aviso sonoro
- `/painel/cardapio` categorias, produtos, adicionais
- `/painel/entrega` bairros e taxas
- `/painel/loja` nome, logo, cor, horário, aberta/fechada, pedido mínimo

## Nomes das coisas

Escrever como uma pessoa brasileira da equipe escreveria. Vocabulário do domínio em português,
igual ao banco; termos do framework ficam como são (`children`, `useState`, `page.tsx`).

Faça:
- Componentes: `CartaoDoProduto`, `BarraDaSacola`, `SeletorDeAdicionais`, `LinhaDoPedido`
- Funções começam com verbo: `calcularTotalDaSacola`, `formatarPreco`, `buscarLojaPeloLink`
- Arquivos em kebab-case e português: `cartao-do-produto.tsx`, `buscar-loja.ts`
- Variáveis que dizem o que são: `itensDaSacola`, `bairroEscolhido`, `pedidosNovos`
- Comentário só quando explica o porquê de algo não óbvio

Evite:
- `data`, `item`, `info`, `temp`, `handler`, `helper`, `utils`, `manager`, `service` soltos
- Prefixos como `My`, `Custom`, `Base`, `Generic`
- Comentários que repetem o código ("// incrementa o contador")
- `// TODO: implementar` deixado no código entregue
- Emoji em código, commit, texto da interface ou nomes de arquivo
- Pasta `components/ui` com 40 arquivos copiados "por garantia". Só criar o que for usado.

Preço sempre em centavos no código; só vira "R$ 12,90" na hora de mostrar (`formatarPreco`).

## Direção de design

O objetivo é parecer feito por alguém que conhece lanchonete, não um template.

Evite o que denuncia layout genérico:
- Gradiente roxo/azul, texto com gradiente, brilho neon
- Vidro fosco (glassmorphism) e sombra grande em todo cartão
- Todo elemento com cantos muito arredondados e o mesmo espaçamento
- Emoji no lugar de ícone, ícones de estilos misturados
- Hero centralizado com título enorme e dois botões
- Textos vazios de marketing: "Sabor que conquista", "Experiência incrível", "Peça já o seu!"

Faça:
- Cor principal vem da loja (`lojas.cor_principal`). A interface usa essa cor no botão
  principal e nos destaques; o resto é neutro (fundo off-white quente, texto quase preto).
- Foto do produto em proporção fixa e sempre com o mesmo corte. Sem foto: bloco liso com a
  inicial do produto, nunca ilustração genérica.
- Tipografia com personalidade nos títulos (ex.: Bricolage Grotesque ou Fraunces) e uma
  fonte simples e legível no corpo. Dois pesos, poucos tamanhos.
- Lista de produtos em linhas (nome, descrição curta, preço, foto pequena à direita), como
  cardápio de verdade, e não grade de cartões idênticos.
- Barra fixa no rodapé do celular: "Ver sacola · 3 itens · R$ 38,50".
- Botões grandes, área de toque confortável, tudo pensado primeiro para tela de 360px.
- Estados reais: carregando, loja fechada ("Estamos fechados. Abrimos hoje às 18h."), sem
  itens, erro de rede, bairro não atendido.

Textos da interface, em português do dia a dia:
- "Adicionar à sacola", "Ver sacola", "Finalizar pedido", "Taxa de entrega", "Troco para quanto?"
- "Pedido recebido", "Estamos preparando", "Saiu para entrega", "Entregue. Bom apetite!"
- Erros diretos e sem culpa: "Não conseguimos enviar o pedido. Tente de novo."

No painel, prioridade é clareza em tela de tablet e celular velho: pedido novo grande e
impossível de não ver, botão de mudar situação com um toque, texto legível a um braço de
distância.

## Ordem de trabalho (um passo por vez)

1. Criar o projeto, conectar ao Supabase (variáveis de ambiente), rodar `schema.sql`.
2. Página da loja `/[link]`: cabeçalho, cardápio por categoria, tela de produto com
   adicionais, sacola guardada no navegador.
3. Finalizar pedido: formulário, escolha de bairro com taxa, pagamento, chamada a
   `criar_pedido`, tratamento das mensagens de erro da função.
4. Página de acompanhamento com `acompanhar_pedido` (atualizar a cada 15 segundos).
5. Painel: login, lista de pedidos em tempo real com som, mudança de situação.
6. Painel: cadastro de cardápio, adicionais, bairros e dados da loja.
7. Cadastro de nova lanchonete (`cadastrar_loja`) e prévia de link para WhatsApp.
8. Revisão de design nas telas reais, com celular de verdade.

## Fica para depois

- Pix pelo app (Mercado Pago, Asaas)
- Mensagem automática no WhatsApp a cada mudança de status
- Impressão térmica
- Tela do entregador, cupons, relatórios, estoque
- Conferir mínimo e máximo de escolhas dos grupos de adicionais dentro de `criar_pedido`
