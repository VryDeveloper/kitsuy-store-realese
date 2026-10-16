# Kitsuy Otaku Store

Plataforma de e-commerce especializada em anime e cultura otaku, com integração de pagamento via Mercado Pago e cálculo de frete em tempo real.

## Testes e CI

Este projeto utiliza **Vitest** para testes unitários e de integração, com **Testing Library** para componentes React.

### Executando testes localmente

```bash
npm test
```

### GitHub Actions

A pipeline de CI/CD é executada automaticamente em cada push e pull request, rodando:

- **Lint**: `npm run lint` (ESLint)
- **Testes**: `npm test` (Vitest)
- **Build**: `npm run build` (Vite)

O workflow está configurado em `.github/workflows/ci.yml`.
