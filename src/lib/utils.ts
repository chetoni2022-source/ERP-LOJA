import { nanoid } from 'nanoid';

/**
 * Gera um slug único de 10 caracteres para links de orçamento.
 */
export const generateBudgetSlug = () => {
  return nanoid(10);
};

/**
 * Formata valores monetários para o padrão brasileiro (R$).
 */
export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

/**
 * Máscara para placa de veículo (AAA-0000 ou Mercosul).
 */
export const formatPlaca = (value: string) => {
    return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
};

/**
 * Máscara para telefone celular.
 */
export const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
        return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    return value;
};
