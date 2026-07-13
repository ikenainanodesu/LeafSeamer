# Configuration Files

Copy only the templates needed by the deployment:

- `nodecg.json.example` -> `nodecg.json` for localhost-only development.
- `nodecg.secure.json.example` -> `nodecg.json` for authenticated control.
- `data-sync-service.json.example` -> `data-sync-service.json` for Google Sheets.
- `schedule-adapter-postgresql.json.example` -> `schedule-adapter-postgresql.json` for PostgreSQL.
- The three control Bundle templates keep privileged legacy messages disabled.

OBS, ATEM, and VB Matrix privileged Dashboard commands require NodeCG login. The server derives identity and roles from the authenticated Socket.IO session; the client cannot submit its own identity. NodeCG local users receive the `superuser` role and can use these controls.

Generate independent random values for the NodeCG session secret and the LeafSeamer secret master key:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Set the second generated value as `LEAFSEAMER_SECRET_MASTER_KEY` in the NodeCG process environment. Do not place it in `cfg`, a backup, or the same secret store that it encrypts.

NodeCG local authentication accepts `algorithm:digest`. Generate the password digest with the chosen session secret and password in a trusted local shell, then replace the placeholder in the secure template:

```powershell
node -e "const c=require('crypto'); console.log('sha256:'+c.createHmac('sha256',process.argv[1]).update(process.argv[2]).digest('hex'))" "SESSION_SECRET" "OPERATOR_PASSWORD"
```

Shell history can retain arguments. Clear the command history or use an equivalent protected secret-provisioning process in production.

`host` only selects the listening interface; it does not restrict source subnets. For LAN deployment, bind to the dedicated control interface and enforce source networks with firewall/VLAN ACL rules. When using a reverse proxy, keep NodeCG on localhost and terminate TLS/authenticated access at the proxy.

Real config files may contain local network addresses or credentials and are intentionally ignored by Git.
