# TDCv2 reference — index

Built from the engine's docs at v0.3.5 (2026-10-17); they say they cover TDC 0.3.5 (updated 17 October 2026).
Open a page with the Read tool: `reference/<path>`. Pages link to each other by relative path.
For another engine version (the one the project itself uses), the same page of that version:
`https://raw.githubusercontent.com/NickLiapin/tdcv2/v<version>/docs/<path>`. What `check` says beats any page.
For data-pack addresses, run `scripts/find-packs.mjs` — it reads what is installed.

- `intro.md` — **Introduction.** TDC generates internally consistent test data. Within each row, names match gender categories, cities belong to the correct countries, and diagnoses fit patient profiles. Run TDC again with the same seed and core version, and it produces the same rows, byte for byte.
- `whats-new.md` — **What's new.** What changed in TDC that you can see — a new command or flag, a new check, something that now works differently — newest first, each with a link to where the docs explain it now. Changes inside the engine that alter nothing you write or read are left out; every change is in the changelog.

## Getting Started

- `getting-started/installation.md` — **Installation.** TDC targets five ecosystems — npm (Node.js / TypeScript), pip (Python), Maven (Java), NuGet (.NET) and Cargo (Rust) — all producing byte-for-byte identical output from the same config, seed, version and output mode (see Determinism & proportions).
- `getting-started/quick-api.md` — **Quick API — one value at a time.** Sometimes you don't want a dataset. You want a surname, here, on this line of a test — the job a faker library does. TDC answers that from the same data packs its configs draw on, so the name in your unit test and the name in your million-row fixture come from one list.
- `getting-started/first-data.md` — **Your first dataset.** You describe what a row is made of, and the engine builds as many rows as you ask for. The same seed always returns the same output, and the shape of that output — plain text, CSV, JSON, SQL — is yours to define with a row template.
- `getting-started/editor-support.md` — **Editor support.** The npm package ships two executables. tdcv2 generates data; tdcv2-lsp is a language server that gives any LSP-speaking editor live error checking, completion, hover, go-to-definition, find-references, rename and formatting for .tdc files.

## Core Concepts

- `core-concepts/configuration.md` — **Configuration structure.** Every TDC config is a single <tdc> root element. It holds two things: an optional <env> (generation parameters, sequences, and fixtures) and a required <block> (the layout of each output record).
- `core-concepts/sequences.md` — **Sequences.** A <sequence> declares a named column of values, count rows long. Think of it as a finished column that exists before rendering starts: the generator fills every row, and as each output row is rendered you pull a value out by name, either with interpolation ${{Name}} or inside an if condition.
- `core-concepts/output-formatting.md` — **Output & formatting.** Once you've declared your data as sequences, the output block turns it into text in whatever shape you want: CSV, JSON, SQL, a log line, a config file. It's three nested tags — <block> → <line> → <data> — plus interpolation and a few optional pieces (fixtures, filters, conditions).
- `core-concepts/determinism.md` — **Determinism & proportions.** Two properties make TDC's data trustworthy: the same seed reproduces the same data byte for byte, and every share comes out at its exact proportion. The promise is precise about what has to match — the same config, the same seed, the same core version and the same output mode.

## Generators

- `generators/overview.md` — **Overview.** A <gen> produces the values of a sequence. Its type attribute chooses which generator to use, and every other attribute is a parameter of that generator:
- `generators/text.md` — **Text.** Use it when you have a short, fixed list of options to pick from — gender, status, category, payment type, tier. If you need exact shares of each (say, 60% one, 40% the other), that's a single extra attribute.
- `generators/number.md` — **Number.** Use it when you need an integer — an id, a code, a price, an age — inside a range; or a string of exactly N digits (even hundreds or thousands of them, far past what an ordinary number type can hold).
- `generators/template.md` — **Template.** Use it when you need realistic real-world data (names, birthdays, countries) or technical identifiers (UUIDs, emails, IBANs, tax numbers) that you don't want to invent by hand. type="template" pulls the value from a built-in source; the value attribute is a dotted path that selects which one, and many templates respect the locale.
- `generators/file.md` — **File.** Use it when the values already live in a file — a list of cities, an export, a CSV — and you don't want to paste them into the config. The src attribute tells the generator where to read them from, and one more attribute, column, decides whether that file is a plain list or a table.
- `generators/date.md` — **Date.** Use it when you need a date or a date-time — a birthday, a document date, an event timestamp — inside a range and printed in a specific format.
- `generators/symbol.md` — **Symbol.** Use it when you need a string of a given length built from a specific set of characters — a token, a coupon code, a random suffix, or "noise" in a particular script. symbol picks one character at a time out of a set you define. (For a whole word from a list, use text instead.)
- `generators/regex.md` — **Regex.** Use it when a value has a strict shape — a phone number, a SKU, a license plate, a token, an order code. There are too many possibilities for a list, and too much internal structure for number: letters, digits, and separators in specific places.
- `generators/advanced-regex.md` — **Advanced Regex.** Use it when you need everything regex does, but the shape of the string itself carries a statistical distribution of variants — say, exactly 70% of the codes start with RU, 20% with US, 10% with DE.
- `generators/counters.md` — **Increment & Decrement.** Use them when you need a running counter instead of a random value — a sequential id or row number (1, 2, 3…), an SKU series that climbs by a fixed step, or a countdown that falls to zero.
- `generators/timeseries.md` — **Time series.** Use it when you need values that move like a real signal over time — daily sales, sensor readings, web traffic. Real series aren't flat noise or a single distribution: they're layers — an overall trend (rising or falling), a repeating season (weekly, yearly), and random noise on top. timeseries builds a row's value exactly that way:
- `generators/pattern.md` — **Pattern.** Use it when a signal has a shape you can't describe with a formula — demand by hour, a demographic wave, a screenshot of a stock chart, any "wiggly" line. You draw the picture, and its shape is stretched across all rows: the horizontal axis is the row number (first … last), the vertical axis is the value. The drawing can be tiny; the rows can number in the millions.
- `generators/http.md` — **HTTP service.** Use it when the value has to come from logic TDC doesn't have — a real check-digit algorithm you already wrote, a lookup in your own database, any calculation that would be painful to express in the config. You stand up a small service, and TDC calls it: it becomes the client of your service, not the host of your code.
- `generators/running.md` — **Running total.** Use it when a value is not drawn but accumulated: an account balance after each transaction, a meter that only goes up, the largest load seen so far. Row 40's value depends on rows 1 to 39.
- `generators/stat.md` — **Statistic.** Use it when a row needs to know something about every row, including the ones after it: is this price above the average, what is the largest order in the file, how many rows carry a value at all.
- `generators/formula.md` — **Formula.** Use it when a column is not drawn but computed — from the other columns of the same row. A weight that follows a height. A BMI from both. A price times a quantity. A remainder you want to print rather than test.

## Pools

- `pools/overview.md` — **Overview.** A generator produces a value. A sequence is a column of those values. That covers most of what a config needs — and then it runs into a wall.
- `pools/filter.md` — **Narrowing with filter.** Without filter, a row draws from the whole pool. With it, a row draws only from the members the expression accepts.
- `pools/linking.md` — **Linking pools together.** One pool gives a row a coherent record. Several pools give a row a coherent world: clinics that exist, doctors who work at one of them, nurses who work alongside those doctors. This page is about how the pieces connect.

## Constructs

- `constructs/overview.md` — **Overview.** A generator produces a value. A construct decides what happens around that value: which one is used, whether it appears at all, how many of them go in a cell, whether it may repeat, and how many rows one record turns into.
- `constructs/mix.md` — **Choosing between values (mix).** Use it when the shares in a column aren't equal and each share is more than a single word. Real data is lopsided: most orders are paid and few are canceled; most accounts are free and few are premium. You want a column where the variants appear in fixed proportions — not split evenly, and not as random noise.
- `constructs/switch.md` — **Lookup tables (switch).** Use it when one field must be derived from another, not drawn on its own. You have a Country column and you need a Currency beside it that is always consistent: US → USD, JP → JPY. A second random generator is exactly wrong here — it would hand you a currency that doesn't match the country. What you want is a lookup table: read one field, return the value keyed to it.
- `constructs/conditional-output.md` — **Conditional output (if).** Use it when a value should decide whether a piece of a row appears, not just what it says: keep one record, drop another; tag some rows and leave the rest bare; put a comma after every record except the last.
- `constructs/multiple-values.md` — **Multiple values in a cell (repeat).** Use it when one field isn't always one value. An order has one item or five. An article carries a single tag or four. A sensor reports three readings at once. repeat makes a single <gen> emit several values into one cell instead of one — and the count can vary from row to row.
- `constructs/relational-tables.md` — **One row per element (each).** Use it when one record really stands for several rows — a customer with a handful of orders, an invoice with line items, a post with tags — and you want them as separate rows in a child table, each carrying a foreign key back to the parent, all from a single config.
- `constructs/unique-values.md` — **Uniqueness (uniq, distinct).** Real datasets have two different "no duplicates" rules, and TDC gives you a separate tool for each:
- `constructs/self-checking.md` — **Self-checking configs (assert).** Use it when the shape of your data matters to whoever consumes it, and you want the run to stop rather than hand over a file that quietly drifted.

## Compute Language

- `compute/overview.md` — **Overview.** A real card number from one run: fifteen generated digits, plus the check digit derived from them.
- `compute/arithmetic.md` — **Arithmetic.** Integer math inside <compute>. Every operation is its own tag; nest them to build an expression tree. These are the arithmetic operators of the TDC language — they live in a <sequence> right next to <gen>, both in your own config and inside the built-in identifier packs.
- `compute/lists.md` — **Lists & iteration.** Two rules shape everything on this page:
- `compute/strings.md` — **Strings & formatting.** These tags shape a string as a step in a calculation. They live inside <compute>, next to <gen> in a <sequence>, and they read other sequences with <field name="…"/> — the same names you'd use in ${{…}}.
- `compute/conditionals.md` — **Conditionals.** Checksum algorithms branch — "if the doubled digit is over 9, subtract 9" (Luhn), "if the remainder is 10, use 0" (mod-11). Bucketing branches too — "under 30 is low, under 80 is mid, otherwise high". <compute> expresses every one of these with a single conditional tag, <choose>, and a handful of yes/no predicates.
- `compute/walkthrough.md` — **A pack read line by line.** The other pages introduce one tag at a time. This one goes the other way: a real generator, start to finish, with every line accounted for. Nothing new is introduced — if you have read Lists and Arithmetic, you have already met every tag below.

## Guides

- `guides/hierarchical-dependencies.md` — **Hierarchical dependencies.** An ordinary fake-data library fills every field independently. TDC ties sequences together in a parent → child relationship: a child's values are generated only on the rows where the parent took a given value, and any percentages inside the child are measured against the size of that filtered subset, not against the whole count.
- `guides/coherent-data.md` — **Coherent & relational data.** Ordinary fake-data generators fill fields independently, so you get impossible pairs: a Fiat with the model Altima (that's a Nissan), a city from one state with a ZIP code from another. TDC does it differently.
- `guides/distinct.md` — **No repeats within a row.** Use it when two fields in the same row draw from the same pool and must not land on the same value — two symptoms for one patient, because nobody presents with fever and fever; a country of birth and a country of residence that shouldn't be identical. <distinct> says one thing: its direct children must differ from each other within a row.
- `guides/files-and-csv.md` — **Reading files & CSV.** When your values already live in a file — a list your team maintains, an export, a spreadsheet saved as CSV — read them with the file generator instead of pasting them into the config. This guide walks the common CSV workflow end to end: a plain list, a single column, the right delimiter, and keeping a record whole.
- `guides/output-formats.md` — **Output formats (CSV, JSON, SQL…).** TDC has no fixed list of exporters, and that's deliberate. The output block assembles text — <before> / <after> wrap the whole run, <block> is one record, and <data> is the raw text — so the same engine produces CSV, JSON, SQL, YAML, NDJSON, or anything else built from characters.
- `guides/masks-and-case.md` — **Masks & case.** A generator produces raw values — exactly as they're built. A US Social Security number is nine digits in a row, a date is 2020-05-14, a name comes out exactly as it sits in the list. A generator is about what the data is, not how it looks: separators, case, and word order aren't its job.
- `guides/statistical-distributions.md` — **Statistical distributions.** A plain <gen type="number" value="150..200"/> draws uniformly — 150 is exactly as likely as 175 or 199. Real data almost never looks like that. People's heights cluster around an average, salaries are skewed (lots of middling ones, a few enormous), and wealth has a long, heavy tail. To generate believable numbers, add a distribution attribute to the number generator.
- `guides/anomalies.md` — **Anomalies & outliers.** Use it when you're building test data for an anomaly detector, a monitoring alert, or an outlier-robust model — anything that has to notice values sitting far outside the normal range. Real data always has a few: a stuck sensor, a fat-finger entry, a suspicious transaction.
- `guides/missing-data.md` — **Missing data.** Use it when you need to test how your code copes with holes. Real data is almost never complete: a phone number was never entered, an income went missing, a field is just blank. If you only ever test on "perfect" rows, the first null in production breaks everything. The missing attribute mixes blanks in on purpose so you can see the failure before your users do.
- `guides/typed-output-parquet.md` — **Typed output & Parquet.** Use it when the file is headed for analysis — pandas, DuckDB, Spark, a data warehouse — and you need it to carry real column types and a real NULL, not just text that a reader has to guess at. Name your <data> columns, give the output a .parquet name, and TDC writes a binary, typed file — no external libraries, no extra flags.
- `guides/large-outputs.md` — **Large outputs & streaming.** By default, TDC generates straight to disk. Memory does not grow with the row count: each row is computed on the fly from its number rather than stored in an array, so the practical limit is disk space and time, not RAM. This needs no setup — it is how an ordinary run already behaves. A handful of config shapes are the exception and are listed in Which engine runs your config.
- `guides/writing-a-service.md` — **Writing a service generator.** The http generator lets a service you wrote decide values. This page is the other half: how to write that service, in any of five languages, so that it is fast, correct, and reproducible. Reproducibility is the one that takes deliberate work, because a service is free to answer differently every time it is asked.
- `guides/performance.md` — **Performance.** How long a run takes, and how much memory it wants. Every number here was measured on one machine by running the five published command lines against the same config — not estimated, not remembered from a previous version.
- `guides/signals-from-formulas.md` — **Signals from formulas.** Most columns in a config are drawn: a name from a pack, a number from a range, a date from a window. A signal is different. Its value at any instant is not a choice — it follows from where you are in time. That makes it a job for <gen type="formula">, and it is the one construct that can produce a shape rather than a bag of values.

## Data Packs

- `data-packs/overview.md` — **Overview.** A data pack is a self-describing file holding a list of values (first names, last names, colors, anything) that TDC picks up automatically and exposes at a short dotted address. You add new data without touching code — just drop a file into a data folder.
- `data-packs/installing-packs.md` — **Installing packs.** Names, cities, states, companies, and other lists are data packs. They ship separately from the engine, so updating the library never overwrites your data, and heavy sets don't bloat every install. A sensible default set is bundled (the top 1000 first names, for instance); the full and extra sets are fetched on demand with tdcv2 pack.
- `data-packs/writing-your-own.md` — **Writing your own.** The simplest pack is a plain file, one value per line, addressed by its path (see Overview). From there, a header unlocks weighted lists, external files, and small generators — all without touching engine code, and all safe to share, since a pack is never more than data or a parsed, sandboxed DSL.

## Reference

- `reference/cli.md` — **CLI.** The tdcv2 command reads a .tdc config, generates the data, and writes it to a file or to standard output. No code of your own is involved.
- `reference/tags.md` — **Tags.** Every tag in the TDC DSL, and where each one is covered in depth.
- `reference/attributes.md` — **Attributes.** Every attribute in the tag DSL, with a one-line description and where it's covered.
- `reference/generators.md` — **Generators.** Every type for <gen>. Each one links to its full page.
- `reference/compute.md` — **Compute functions.** Every tag in the <compute> sub-language, grouped by what it does. The Compute Language section covers how they fit together.
- `reference/builtins.md` — **Built-ins.** TDC creates a few sequences automatically — they're available without being declared in <env>. By convention their names start with an underscore. Use them in interpolation (${{count}}) and in if expressions (if="first").
- `reference/identifiers.md` — **Identifier catalog.** Use it when you need a technical identifier that has to look real and pass a format check — a UUID, an email, an IBAN, a payment-card number, a checksummed tax or document number — without inventing it by hand or copying a real one. Every path on this page is a value for type="template"; the value attribute is a dotted path that picks which identifier you get.
- `reference/errors.md` — **Error codes.** Every diagnostic TDC can raise, listed by code. Look one up when a run stops and the message alone isn't enough.
- `reference/expressions.md` — **Expressions.** The little language with four homes, all reading the same way:
- `reference/comparison.md` — **Comparison and truth.** Everything a TDC config produces is text. A <gen type="number"> produces the text 42, a data pack produces the text Miller, and every built-in is text as well. Nothing carries a type alongside it, because nothing needs one: text is what lands in the CSV file at the end.

## Language Bindings

- `bindings/typescript.md` — **TypeScript.** The TypeScript package is TDC's reference implementation. The CLI is the right tool when you want a file; the library is for pulling data straight into your code — as a string or as live JS objects — without spawning a process or reading a file.
- `bindings/python.md` — **Python.** The Python package reads the same .tdc config and, for the same seed, produces the same output as the TypeScript, Java, C# and Rust implementations. That cross-language guarantee is one of TDC's core promises.
- `bindings/java.md` — **Java.** The Java package reads the same .tdc config and, for the same seed, produces the same output as the TypeScript, Python, C# and Rust implementations — the same cross-language guarantee.
- `bindings/csharp.md` — **C#.** The .NET package reads the same .tdc config and, for the same seed, produces the same output as the TypeScript, Python, Java and Rust implementations — byte for byte, on all three engines and in Parquet.
- `bindings/rust.md` — **Rust.** The crate reads the same .tdc config and, for the same seed, produces the same output as the TypeScript, Python, Java and C# implementations — byte for byte, on all three engines and in Parquet.
- `bindings/same-names.md` — **The same names everywhere.** The five packages are one library with five front ends, and the object a finished run hands back answers to the same names in all of them — spelled each language's own way, meaning exactly the same thing.
