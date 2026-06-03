---
name: push-after-change
description: >-
  Commits and pushes to GitHub after every completed code change in this repo.
  Use when finishing any implementation, fix, or edit the user requested for
  space-dodger / Space Dodger, unless they explicitly say not to push or commit.
---

# Push til GitHub etter hver endring

Når du har **fullført** en oppgave brukeren ba om (kode, HTML, CSS, README), og det finnes endringer i repoet: **commit og push** uten å vente på at brukeren ber om det.

## Unntak – ikke push

- Brukeren sier eksplisitt «ikke push», «ikke commit», «bare lokalt», osv.
- Ingen filendringer (kun spørsmål / forklaring)
- Kun midlertidig utforskning uten leveranse
- Filer som sannsynligvis inneholder hemmeligheter (`.env`, credentials) – ikke legg i commit; varsle brukeren

## Arbeidsflyt (kjør i denne rekkefølgen)

### 1. Sjekk tilstand (parallelt)

```bash
git status
git diff
git diff --staged
git log -3 --oneline
```

### 2. Commit

- Stage kun relevante filer for oppgaven
- Melding: 1–2 setninger på engelsk, fokus på *hvorfor*
- Bruk HEREDOC:

```bash
git add <filer>
git commit -m "$(cat <<'EOF'
Kort beskrivelse av endringen.

EOF
)"
```

**Git-sikkerhet (alltid):**
- Aldri `git config`
- Aldri force push til `main`/`master`
- Aldri `--no-verify` med mindre brukeren ber om det
- Ikke `commit --amend` med mindre bruker ber om det og HEAD er din upushede commit

### 3. Push

```bash
git pull --rebase origin main
git push origin main
```

Ved rebase-konflikt: løs konflikter, `git add`, `git rebase --continue`, deretter push.

Hvis aktiv branch ikke er `main`, push den branchen: `git push -u origin HEAD`.

### 4. Bekreft til brukeren

Gi kort svar på norsk med:
- commit-hash (kort)
- commit-melding
- lenke til repo: https://github.com/maxeengel/space-dodger
- at GitHub Pages kan ta ~1 min å oppdatere; hard refresh ved behov

## Eksempel på avslutning

> Endringen er pushet. **Commit:** `a1b2c3d` – *Add heart lives display*. **Repo:** https://github.com/maxeengel/space-dodger

## Dette repoet

- Remote: `https://github.com/maxeengel/space-dodger.git`
- Standard branch: `main`
- Hosting: GitHub Pages fra `main`
