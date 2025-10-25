# 📋 Sistema de Ordenação Personalizada de Produtos

## 🎯 Visão Geral

O site agora possui um sistema de ordenação personalizada que permite você controlar a ordem de exibição dos produtos independentemente da ordem de registro no Firebase.

## 🔧 Como Funciona

Os produtos são ordenados pelo campo `displayOrder` (número). Produtos com números menores aparecem primeiro.

### Exemplo:
- Produto com `displayOrder: 1` → Aparece primeiro
- Produto com `displayOrder: 2` → Aparece em segundo
- Produto com `displayOrder: 3` → Aparece em terceiro
- Produto sem `displayOrder` → Aparece no final

## 📝 Como Configurar no Firebase

### Opção 1: Adicionando o campo manualmente no Firebase Console

1. Acesse o Firebase Console: https://console.firebase.google.com
2. Selecione seu projeto
3. Vá em **Firestore Database**
4. Navegue até a coleção `products`
5. Clique em um produto específico
6. Clique em **"Adicionar campo"** (Add field)
7. Configure:
   - **Nome do campo**: `displayOrder`
   - **Tipo**: `number`
   - **Valor**: Número que define a posição (ex: 1, 2, 3, etc.)
8. Clique em **Salvar**

### Opção 2: Exemplo de estrutura de produto no Firebase

```json
{
  "title": "Gojo Satoru - Jujutsu Kaisen",
  "price": "R$ 450",
  "category": "Figure",
  "image": "https://...",
  "description": "Figure premium de Gojo Satoru",
  "displayOrder": 1,
  "stock": 5,
  "featured": true
}
```

## 📊 Exemplos de Ordenação

### Destacar produtos específicos no topo:
```
Produto A → displayOrder: 1 (Novo lançamento)
Produto B → displayOrder: 2 (Mais vendido)
Produto C → displayOrder: 3 (Oferta especial)
Produto D → displayOrder: 4
Produto E → displayOrder: 5
```

### Produtos sem displayOrder:
Produtos sem o campo `displayOrder` aparecem automaticamente no final da lista, após todos os produtos ordenados.

## 🎨 Dicas de Uso

1. **Novos Lançamentos**: Use números baixos (1-10) para destaque
2. **Produtos Populares**: Use números médios (11-50)
3. **Produtos Normais**: Use números altos (51+)
4. **Produtos a Remover**: Não precisa deletar, apenas aumente o displayOrder para 9999

## ⚠️ Observações Importantes

- O campo `displayOrder` é **opcional**
- Produtos sem este campo aparecerão no final
- Você pode usar qualquer número (1, 2, 3, 10, 100, etc.)
- Não precisa ser sequencial (pode pular números)
- Números menores = aparecem primeiro
- Para reorganizar, basta alterar os números

## 🔄 Reorganizando Produtos

### Exemplo: Trocar posição de dois produtos

**Antes:**
- Produto A: `displayOrder: 1`
- Produto B: `displayOrder: 2`

**Depois (invertendo a ordem):**
- Produto A: `displayOrder: 2`
- Produto B: `displayOrder: 1`

## 💡 Exemplo Prático

Se você quer que um produto específico apareça sempre em primeiro:

1. Acesse o produto no Firebase
2. Adicione ou edite o campo `displayOrder`
3. Coloque o valor `1`
4. Salve
5. Recarregue o site e o produto aparecerá em primeiro lugar!

## 🚀 Resultado

Os produtos serão exibidos no site na ordem que você definir, dando total controle sobre o layout da vitrine!
