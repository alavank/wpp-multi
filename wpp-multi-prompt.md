Atue como um Engenheiro de Software Full-Stack Sênior e Arquiteto de Soluções. Sua tarefa é estruturar e desenvolver a fundação de um sistema de multiatendimento de WhatsApp. 

Leia atentamente o escopo abaixo e gere a estrutura inicial do projeto, o modelo de dados (schema) e os componentes principais.

<contexto_do_projeto>
O sistema será hospedado em infraestrutura on-premise para uso em diversos departamentos. Um único número de WhatsApp servirá múltiplos atendentes em um setor, com suporte a múltiplos setores/departamentos (cada um com seu próprio número e fila).
</contexto_do_projeto>

<arquitetura_e_stack>
- Frontend: SPA e PWA inegociável para performance desktop/mobile. React, Vite, TypeScript.
- Backend: Node.js.
- Banco de Dados: PostgreSQL (Supabase) para gestão robusta de relacionamentos e concorrência.
- Tematização: Suporte nativo a Dark Mode e Light Mode.
</arquitetura_e_stack>

<regras_de_negocio_e_hierarquia>
- Super Admin: Cria departamentos/setores, vincula números, gerencia usuários globais e define permissões.
- Admin de Departamento (Coordenador): Acesso a dashboards de produtividade, controle de filas e gestão de dados da sua equipe.
- Atendente: Acessa filas do setor, atende, transfere e visualiza histórico. Exige cadastro com Nome Completo e Foto.
</regras_de_negocio_e_hierarquia>

<permissoes_e_multi_departamento>
- O controle de acesso (RBAC) deve ser granular e definido por usuário individualmente, não apenas por perfil.
- Um usuário pode ser vinculado a múltiplos departamentos simultaneamente.
- Na interface de atendimento, chats vindos de departamentos distintos para o mesmo usuário devem exibir uma tag visual clara (ex: cor ou label com o nome do setor) para evitar confusão.
</permissoes_e_multi_departamento>

<auditoria_e_logs>
- Implementar registro de logs detalhado para todas as ações do sistema.
- Estrutura de dados exigida para cada log: Usuário, Ação (o que fez), Timestamp (dia/hora exatos), IP, Localização, Dispositivo e Navegador (User-Agent).
</auditoria_e_logs>

<monitoramento_realtime_timeline>
- Criar um módulo de Dashboard de Monitoramento em Tempo Real com design futurista focado na atividade instantânea.
- Interface principal: Uma "Timeline" animada horizontalmente (janela de tempo de 1 a 2 minutos visíveis).
- Comportamento visual: Eventos (ex: "Usuário X logou", "Usuário Y iniciou atendimento do número Z") surgem do lado direito em formato de cards/balões e deslizam continuamente para a esquerda até desaparecerem.
- Prevenção de colisão: O posicionamento vertical dos cards deve ser aleatório ou calculado em eixos separados para impedir sobreposição (encavalamento) de eventos simultâneos.
</monitoramento_realtime_timeline>

<fluxo_de_atendimento>
1. Retenção de histórico completo do contato (mínimo de 1 ano).
2. Mensagem automática ao assumir chat: "[Nome do Atendente] vai iniciar seu atendimento...".
3. Prefixo em cada envio: "[Nome do Atendente] disse: [mensagem]".
4. Transferência entre usuários com retenção de contexto.
5. Encerramento explícito com registro de data/hora e responsável.
</fluxo_de_atendimento>

<funcionalidade_agendamento_retorno>
- Dentro da conversa ativa, o atendente deve ter um botão "Agendar Retorno".
- O clique aciona um modal com os campos: Data, Horário e Assunto.
- Os campos "Nome do Contato" e "Número" devem ser autopreenchidos com base na sessão atual.
- Ao salvar, o sistema deve oferecer uma opção (ex: checkbox) para enviar uma mensagem automática de confirmação do agendamento para o cliente no chat.
</funcionalidade_agendamento_retorno>

<interface_e_funcionalidades_chat>
- Painel de Detalhes: Exibe Nome, Foto e metadados ao clicar no contato.
- Grupos: Mapeamento e exibição de grupos que o número do departamento participa.
- Mídia: Suporte a áudio, imagens, vídeos, documentos e vídeos instantâneos circulares.
- Design Visual: Seguir ESTRITAMENTE as imagens de mockup na pasta `/design`.
</interface_e_funcionalidades_chat>

<gestao_de_filas_abas>
- [Aguardando Atendimento]: Ordenação FIFO (mais antigas no topo).
- [Em Atendimento]: Conversas assumidas e não finalizadas.
- [Finalizadas]: Histórico concluído. Nova mensagem retorna o chat para o fim de [Aguardando].
- [Transferências]: Sub-abas para "Enviados" e "Recebidos".
</gestao_de_filas_abas>

Com base nas diretrizes acima:
1. Proponha a estrutura de pastas do projeto (Frontend e Backend).
2. Crie o schema inicial do banco de dados refletindo todas as entidades citadas.
3. Descreva a lógica de estado global para gerenciar a transição das conversas entre as abas.

Codex irá revisar sua saída quando você terminar.