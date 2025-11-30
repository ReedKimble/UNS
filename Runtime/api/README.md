# UNS Runtime REST API

This service exposes the Universal Number Set (UNS) runtime as a stateless REST API so that IDEs, notebooks, or automation can compile and execute `.unse` programs without launching the browser-based playground.

## Goals

- Provide an HTTP facade over the existing tokenizer → parser → compiler → virtual machine pipeline described in `Runtime/Implementation/UNS_Model_VM_Implementation.md`.
- Keep results explainable by returning ASTs, emitted opcodes, VM traces, and captured diagnostics in every response.
- Make `.unse` sample programs available over the API for quick prototyping.
- Document everything with an OpenAPI/Swagger definition that doubles as live docs via Swagger UI.

## Planned Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/v1/health` | Liveness ping. |
| `POST` | `/api/v1/runtime/compile` | Tokenize + parse + compile without executing. Returns AST, tokens, instructions. |
| `POST` | `/api/v1/runtime/execute` | Compile + execute, returning the final stack value, binding summaries, trace, diagnostics, and optional readouts. |
| `POST` | `/api/v1/runtime/read` | Convenience endpoint that executes a program and returns `read(value \| state)` results for specific bindings. |
| `GET` | `/api/v1/examples` | Lists bundled `.unse` sample programs (reads from `Examples/*.unse`). |
| `GET` | `/api/v1/examples/{id}` | Returns the full source for a sample by slug/id. |
| `GET` | `/openapi.json` | Serves the OpenAPI document (also mounted under `/docs`). |

## Runtime Reuse Strategy

To keep the SPA and the API consistent, the server extracts the tokenizer, parser, compiler, VM, helper libraries, and simplex operators directly from `uns_runtime_app.html` into a reusable, DOM-free module. Both the browser app and the REST server now share identical semantics.

## Implementation Notes

- Node.js + Express (CommonJS) keeps the setup lightweight and friendly to Windows users.
- Diagnostics (e.g., `printU`/`plotU`) are captured in-memory and returned as arrays.
- File-system access stays read-only and restricted to the `Examples/` directory.
- All inputs are validated with lightweight schema guards before the runtime executes to prevent accidental resource exhaustion (e.g., >32k microstates).

## Local Usage

```powershell
cd Runtime/api
npm install
npm start  # listens on http://localhost:7070
```

- `npm run dev` starts the server with `nodemon` for hot reloads.
- The service exposes Swagger UI at <http://localhost:7070/docs> and the raw contract at <http://localhost:7070/openapi.json>.
- Run `npm run build:swagger-ui` to regenerate a static `/Runtime/api/docs` bundle (ships `index.html` + `openapi.json`) for sharing outside the running server. The directory is gitignored so these assets exist only in the environment where you run the command.
- Set `SWAGGER_SERVER_URL=https://example.com/api/v1` before `npm start` to override the `servers` array that Swagger UI advertises (handy when fronting the API with a gateway).

## Request Examples

Compile a snippet without running it:

```powershell
Invoke-RestMethod `
	-Method Post `
	-Uri http://localhost:7070/api/v1/runtime/compile `
	-ContentType application/json `
	-Body (@{ source = "let f = lift1(sqrt, const(4));" } | ConvertTo-Json)
```

Execute and measure specific bindings:

```powershell
$body = @{
	source = @'
		state psi = uniform_state()
		let f = lift1(index, psi)
	'@
	reads = @(@{ value = 'f'; state = 'psi' })
} | ConvertTo-Json -Depth 5

Invoke-RestMethod -Method Post -Uri http://localhost:7070/api/v1/runtime/read -ContentType application/json -Body $body
```

## OpenAPI Contract

The complete schema lives at `Runtime/api/openapi/openapi.yaml`. Update this file when routes or payloads change—the Express server automatically reloads it on startup so `/docs` reflects the latest specification. Use `npm run build:swagger-ui` whenever you need a freshly generated static Swagger UI (outputs to `Runtime/api/docs`). In hosted scenarios (e.g., Vercel), run this command during the platform's build step with `SWAGGER_SERVER_URL` pointing at the public gateway so the generated artifacts reflect the deployment environment without ever committing those URLs to git.
