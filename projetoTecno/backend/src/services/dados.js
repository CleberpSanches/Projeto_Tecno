export const salas = [
    {
        id: 1,
        nome: "Projeto Tecno",
        codigo: "TECNO123",
        membros: [1],
    },
];

export const quadros = [
    {
        id: 1,
        nome: "Quadro Geral",
        sala_id: 1,
        visibilidade: "sala",
    },
];

export const listas = [
    {
        id: 1,
        nome: "A Fazer",
        quadro_id: 1,
        ordem: 1,
    },
    {
        id: 2,
        nome: "Em Andamento",
        quadro_id: 1,
        ordem: 2,
    },
    {
        id: 3,
        nome: "Concluído",
        quadro_id: 1,
        ordem: 3,
    },
];

export const tarefas = [
    {
        id: 1,
        titulo: "Desenvolver API",
        descricao: "Implementar os endpoints do sistema",
        prazo: "2026-11-01",
        status: "em_andamento",
        sala_id: 1,
        quadro_id: 1,
        lista_id: 2,
        responsaveis: [1],
        arquivada: false,
    },
];

export const usuarios = [];


// Estruturas temporárias em memória para checklists e comentários.
// Os dados serão perdidos ao reiniciar o servidor até a integração com o banco.
export const itensChecklist = [];
export const comentarios = [];

// Etiquetas temporárias em memória; serão persistidas na integração com o banco.
export const etiquetas = [];

// Histórico append-only em memória. A API não disponibiliza edição ou exclusão dos registros.
export const atividades = [];

// Convites e notificações temporários em memória. Serão persistidos na integração com o banco.
export const convites = [];
export const notificacoes = [];
