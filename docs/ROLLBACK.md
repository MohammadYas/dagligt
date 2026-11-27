# Rollback — VagtStatus web-redesign

Live site: https://autovagt-mo.netlify.app (Netlify site `99f6e897-1258-4e74-824a-9f9e246d2ebe`).

## Før redesignet (sidst kendte gode udgave)

- Netlify-deploy: `6af42d226115c60274e6038f` (11. nov 2026). Indeholder både frontend og funktioner.
- Git: tag `rollback/foer-redesign` = commit `471bec0`.

## Rul tilbage (ca. 10 sekunder, ingen ny build)

```powershell
netlify api restoreSiteDeploy --data '{"site_id":"99f6e897-1258-4e74-824a-9f9e246d2ebe","deploy_id":"6af42d226115c60274e6038f"}'
```

Eller i Netlify: Deploys → deployet fra 11. nov → "Publish deploy".

## Data ved rollback

- Dropbox-filerne (`kontrol.txt`, `dage.txt`, `torn_dage.txt`, `bureauer.txt`) har samme format i begge udgaver. Intet skal konverteres.
- Løn ligger på telefonen i `localStorage['vagtstatus.lon.v1']`, samme nøgle og JSON-format i begge udgaver. Vagter oprettet i den nye app ses også i den gamle.
- Den nye app gemmer ved første start en uændret kopi af de gamle løndata i `vagtstatus.lon.v1.backup`. Den overskrives aldrig.
- Adgangskoden (`dagligapp.adgang`) er den samme i begge udgaver.
