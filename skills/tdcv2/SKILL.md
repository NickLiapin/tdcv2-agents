---
name: tdcv2
description: Use when someone needs test data, fixtures, seed data, mock or synthetic records — CSV, JSON, SQL inserts or any text format — especially when fields must agree with each other (name matches gender, city matches country), shares must be exact, related tables must link, or the same data must come back on every run; also whenever TDCv2, tdcv2 or a .tdc file is mentioned.
---

# TDCv2 — test data from a config

TDCv2 is a deterministic test-data engine. You write a small `.tdc` config; the engine
generates the rows **locally**. Same config, same `seed` → the same file, byte for byte.
The config is the deliverable — hand it over with the data.

This skill is instructions only; the engine runs in the terminal — `npx -y tdcv2@0.3.3 …`
(Node ≥ 20). Invoking the skill again runs nothing.
`<skill>` below means this skill's own folder.

Commands here run the same in bash, zsh, PowerShell and cmd. Keep yours so: one command
at a time (Windows PowerShell 5.1 has no && chaining); look into files with
`node <skill>/scripts/peek.mjs <file>`, not `cut`, `grep`, `sort`, `wc`. PowerShell
refusing `npx` ("running scripts is disabled") → `npx.cmd`, same arguments.

## The engine makes the rows — not you

The delivered file is exactly what `npx -y tdcv2@0.3.3 <name>.tdc -o <file>` wrote. Nothing
else produces or touches it:

- no script (JS, Python, shell) that imports `tdcv2` and picks values itself;
- no name, city or diagnosis lists typed into code — lists belong in the config or come
  from packs;
- no fixing rows afterwards with `sed`, Python or by hand.

If the config cannot express a requirement (see `reference/INDEX.md`), say plainly what
is missing — a hand-made file reported as "generated with TDCv2" is worse than none.

**Red flags — back to the config:** "a quick generator around tdcv2", "I'll
post-process the output", "easier to make this column in Python".

## Workflow

**First: who reads the rows?**

- **Code in the project** — a test, a fixture, a seed script. Write the config (steps
  1–5), then the code loads it itself — no JSON or CSV in between, it would drift from
  the config:

  ```js
  // TypeScript / JS — npm i -D tdcv2@0.3.3
  import { TDC } from "tdcv2";
  const users = new TDC({ configFile: "test/users.tdc" }).toArray(); // objects, values are strings
  ```

  ```python
  # Python — pip install tdcv2==0.3.3 (into the project's environment)
  from tdcv2 import TDC
  users = TDC(config_file="tests/users.tdc").to_array()
  ```

  Java, C#, Rust, and the traps of each: `<skill>/from-code.md`.

  **Red flag:** `npx -y tdcv2@0.3.3 users.tdc -o users.json` (or `.csv`) so that a test can
  read it — that is the fixture to avoid; the test calls the loader above. If adding the
  library to the project fails, say so before falling back to a generated file.
- **A person or another tool** wants a file — steps 1–7.

1. **Turn every requirement into config or an `<assert>`.** "Age 18–90" is the range
   *and* `<assert each="Age >= 18 && Age <= 90" says="…"/>`; the engine then checks it on
   every row and stops with the row number if it fails.
2. **Find data before writing a `template` path:**
   `node <skill>/scripts/find-packs.mjs <words>` (`last name`, `email`). Never guess a
   path; the script lists the ones installed here.
3. **Write `<name>.tdc`** next to the output file, with `count` and `seed` inside `<env>`.
4. **Check:** `npx -y tdcv2@0.3.3 check --brief <name>.tdc`. Fix every line it prints — a
   `help: did you mean …` part names the right spelling.
5. **Look at a few rows:** `npx -y tdcv2@0.3.3 <name>.tdc --count 5`.
6. **Generate** (only when the rows go to a file): `npx -y tdcv2@0.3.3 <name>.tdc -o <file>` — no `--count`/`--seed` flags, so the
   config alone reproduces the file.
7. **Prove it from the file, then report.** `node <skill>/scripts/peek.mjs <file>` —
   row count, and per column the distinct values, the split, the range; add
   `--column <name>` for one column in full. Say "generated" only if step 6 ran in this
   turn and succeeded. Report the file, the config and the command that regenerates it.

Editing an existing config: change only what was asked, then run steps 4–7 again.

## The shape of a config

```xml
<tdc>
  <env count="100" seed="clinic" local="en">
    <before><line><data>id,gender,first_name,age,diagnosis</data></line></before>
    <sequence name="Id"><gen type="increment" value="1"/></sequence>
    <sequence name="Gender"><gen type="text" value="M,F" percent="50,50"/></sequence>
    <sequence name="MaleName" parent="Gender.M"><gen type="template" value="person.male.firstName"/></sequence>
    <sequence name="FemaleName" parent="Gender.F"><gen type="template" value="person.female.firstName"/></sequence>
    <sequence name="Age"><gen type="number" value="18..90"/></sequence>
    <sequence name="MaleDx" parent="Gender.M"><gen type="template" value="person.male.diagnosis"/></sequence>
    <sequence name="FemaleDx" parent="Gender.F"><gen type="template" value="person.female.diagnosis"/></sequence>
    <assert each="Age >= 18 && Age <= 90" says="every patient is an adult under 91"/>
  </env>
  <block>
    <line><data>${{Id}},${{Gender}},${{MaleName}}${{FemaleName}},${{Age}},${{MaleDx}}${{FemaleDx}}</data></line>
  </block>
</tdc>
```

- `<sequence>` is a column; `<gen>` says where its values come from. `<block>` is the
  template of **one** output record; `${{Name}}` prints a column.
- `parent="Gender.M"` draws a column **only** on rows where `Gender` is `M`; elsewhere it
  is empty. Two mirrored columns printed side by side give exactly one value per row, and
  it always fits the parent. This is how fields agree with each other.
- `<before>` / `<after>` print once around the whole run (CSV header, JSON `[` `]`).
- **It looks like XML and is not: nothing is escaped or expanded.** Write operators as
  they are — `if="Age < 18 || Age >= 65"`, `each="A >= 1 && A <= 9"`, `!=`, `!_last` —
  and `"`, `<`, `>`, `&` as plain characters in `<data>`. `&lt;`, `&amp;&amp;`, `and`,
  `=` are refused in expressions; an entity in `<data>` is printed as is.

## Generators you need most

| need | write |
| :--- | :--- |
| pick from a list | `<gen type="text" value="a,b,c"/>` — no `percent`: equal shares, exactly |
| exact shares | `<gen type="text" value="shipped,pending" percent="70,30"/>` — 70 % exactly, not "about" |
| integer / decimal range | `<gen type="number" value="5..500"/>`, `decimals="2"` for `12.30` |
| date in a range | `<gen type="date" from="2025-01-01" to="2025-12-31" format="YYYY-MM-DD"/>` |
| running id | `<gen type="increment" value="1"/>` |
| shaped string | `<gen type="regex" value="[A-Z]{2}[0-9]{9}"/>` |
| real-world data | `<gen type="template" value="person.lastName"/>` — paths from `find-packs.mjs` |

In `<data>`: `${{Name | lower}}`, `${{Name | upper}}`; `${{Name | csv}}` quotes a CSV
field; `${{Name | sql}}` escapes a SQL string literal. Built-ins: `${{_count}}` (row
number), `_last` (last record: `<data if="!_last">,</data>` for JSON commas), `_total`.

## Checks and whole-run rules (inside `<env>`)

- `<assert each="Amount >= 5 && Amount <= 500" says="…"/>` — every row.
- `<assert that="…" says="…"/>` — once, over whole-run numbers from
  `<gen type="stat" of="Col" op="count"/>` columns or `_total`.
- Unique by construction — the cheap way: put the running id in it,
  `${{First | lower}}.${{Last | lower}}${{Id}}@example.com`.
- One drawn column unique: `uniq="true"` on its `<sequence>` — lists, packs, number
  ranges; `regex` after 0.3.2 (`<sequence name="Code" uniq="true"><gen type="number" value="1000..9999"/></sequence>`);
  not computed templates like `common.internet.email` (refused — use the counter).
- A combination unique across rows: wrap its sequences in `<uniq>…</uniq>` (plain
  single-`<gen>` sequences only) — `reference/constructs/unique-values.md`.

## Parent and child tables

One record can print several lines: give the child list `repeat=`, put `each=` on its
line. `${{_item_id}}` is a unique child key; the parent's columns keep their values.

```xml
<tdc>
  <env count="50" seed="shop" local="en">
    <sequence name="Id"><gen type="increment" value="1"/></sequence>
    <sequence name="Name"><gen type="template" value="person.lastName"/></sequence>
    <sequence name="Orders"><gen type="number" value="10..999" decimals="2" repeat="0..5"/></sequence>
  </env>
  <block>
    <line><data>INSERT INTO customers (id, name) VALUES (${{Id}}, '${{Name | sql}}');</data></line>
    <line each="Orders"><data>INSERT INTO orders (id, customer_id, amount) VALUES (${{_item_id}}, ${{Id}}, ${{Orders}});</data></line>
  </block>
</tdc>
```

## Mistakes that cost the most time

| wrong | right |
| :--- | :--- |
| no `seed=` on `<env>` — nothing warns, every run is a different file | `seed="…"`, always |
| `format="YYYY-mm-DD"` — `mm` is minutes, the month comes out `00` | `format="YYYY-MM-DD"` |
| `&lt;`, `&gt;`, `&amp;&amp;`, `&quot;` — refused in `if=`/`each=`, printed as is in `<data>` | the character itself: `<`, `>=`, `&&`, `"` |
| `person.firstName`, `person.country`, `internet.email` | ask `find-packs.mjs`: `person.male.firstName` / `person.female.firstName` under `parent=`, `location.country`, `common.internet.email` |
| `decimal="2"` | `decimals="2"` |
| lower-casing with `<compute>` | `${{First | lower}}` in `<data>` |
| `--count 500` on the command line for the final file | `count="500"` in `<env>` — the config must reproduce the file alone |
| a list of countries typed "at random" when N distinct are asked for | `text` with exactly N values: equal shares guarantee every one appears |
| guessing a tag or attribute | `reference/reference/tags.md`, `reference/reference/attributes.md` |

More traps, each run on the engine — the silent ones first: `<skill>/traps.md`.

## Other languages

`local="fr"` needs the French pack. npm ships English, `common.*` and `usa.*`; the rest:
`npx -y tdcv2@0.3.3 init --yes` (once per project), then `npx -y tdcv2@0.3.3 pack add <locale>`.
`find-packs.mjs … --locale fr` says whether it is there.

## Reference

`reference/INDEX.md` lists every page of the engine's docs, one line each — open the page
instead of guessing (codes: `reference/reference/errors.md`). The pages are for the
engine version INDEX.md names. If the project uses another engine version, or a page
disagrees with `check`, read that version's page:
`https://raw.githubusercontent.com/NickLiapin/tdcv2/v<version>/docs/<path>`. `check` beats
any page.
