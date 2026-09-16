export type Categoria = 'alimento' | 'transporte' | 'lazer' | 'saúde' | 'outros';

export type Despesa = {
    id: string;
    titulo: string;
    valor: number;
    categoria: Categoria;
    pago: boolean;
};

export const categorias: Categoria[] = [
    'alimento',
    'transporte',
    'lazer',
    'saúde',
    'outros',
];
