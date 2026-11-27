# Fluxo de branches

| Branch | Para que serve |
|---|---|
| `main` | **Produção.** Só recebe código já testado no preview. Todo push nela publica o site. |
| `feature/<nome>` | Uma mudança nova (ex.: `feature/pagina-produto`). |
| `fix/<nome>` | Uma correção (ex.: `fix/frete-sp`). |

Não existe branch `dev`: cada branch enviada ao GitHub ganha um **preview da Vercel** com link próprio, que faz o papel de ambiente de testes.

> Branches antigas (`feature/checkout-pagamento`, `minha-recuperacao`, `producao`, `dev`, `master`) não recebem mais nada.

## 1. Começar uma mudança

```powershell
git switch main
git pull
git switch -c feature/nome-da-mudanca
```

## 2. Trabalhar e salvar

```powershell
git status
git add .
git commit -m "feat: descreve o que mudou"
```

Prefixos: `feat:` (novidade), `fix:` (correção), `style:` (visual), `docs:` (texto), `chore:` (manutenção).

Antes de enviar, confira:

```powershell
npm run lint
npm test
npm run build
```

## 3. Enviar e testar no preview

```powershell
git push -u origin feature/nome-da-mudanca
```

A Vercel cria o preview em ~1 minuto. O link aparece no GitHub (no commit ou no PR) e em `vercel ls`.

> O preview usa o **mesmo banco (Firestore) e o mesmo Blob da produção**: o que você salvar no painel do preview aparece no site oficial.

## 4. Abrir o PR para a `main`

```powershell
gh pr create --base main --fill
```

O CI (lint, testes e build) roda sozinho no PR. Corrigiu algo? Faça um commit novo e dê `git push` de novo; o PR atualiza sozinho.

## 5. Publicar (merge na `main`)

Com o preview conferido e o CI verde:

```powershell
gh pr merge --merge --delete-branch
```

Ou pelo botão **Merge pull request** no GitHub. O push na `main` dispara o deploy de produção na Vercel.

Depois, atualize sua cópia local:

```powershell
git switch main
git pull
git branch -d feature/nome-da-mudanca
```

## Se der problema em produção

1. Vercel → Deployments → escolha o último deploy bom → **Promote to Production** (volta o site na hora).
2. Desfaça o commit na `main` sem reescrever o histórico:

```powershell
git switch main
git pull
git revert <hash-do-commit>
git push
```

## Regras

- Nunca `git push --force` na `main`.
- Nunca commitar `.env`, `.env.local` ou chaves.
- Uma branch por assunto: mudanças pequenas e separadas são mais fáceis de testar e de desfazer.
