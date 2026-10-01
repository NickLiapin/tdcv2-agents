# TDCv2 data from code — tests, fixtures, seed scripts

Load the config in the project's own language and read rows — no CSV to parse, no
fixture file to keep in sync. Add the engine to the project as a dev dependency first
(the install column below); `npx` alone does not make it importable. Keep the `.tdc` in the repository with `count` and `seed`
inside `<env>`: every run of the suite then sees the same rows, in every language. For
the config below, each of the five programs on this page prints the same line:
`5 Robert 84`.

```xml
<tdc>
  <env count="5" seed="users" local="en">
    <sequence name="Id"><gen type="increment" value="1"/></sequence>
    <sequence name="Gender"><gen type="text" value="M,F"/></sequence>
    <sequence name="Name" parent="Gender.M"><gen type="template" value="person.male.firstName"/></sequence>
    <sequence name="Age"><gen type="number" value="18..90"/></sequence>
  </env>
  <block><line><data>${{Id}},${{Gender}},${{Name}},${{Age}}</data></line></block>
</tdc>
```

| language | install | load | rows | one value | column that does not apply¹ |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TypeScript / JS | `npm i -D tdcv2@0.3.3` | `new TDC({ configFile })` | `toArray()` → array | `row.Name` | `undefined` |
| Python ≥ 3.10 | `pip install tdcv2==0.3.3` | `TDC(config_file=…)` | `to_array()` → list | `row["Name"]` | `None` |
| Java | `io.github.nickliapin:tdcv2:0.3.3` | `new TDC(path)` | `toArray()` → `List<TDC.Row>` | `row.get("Name")` | `null` |
| C# | `dotnet add package Tdcv2 --version 0.3.3` | `new Tdc(path)` | `ToArray()` → `IReadOnlyList<Tdc.Row>` | `row["Name"]` | `null` |
| Rust | `cargo add tdcv2@0.3.3` | `Tdc::from_file(path)?` | `to_array()` → `Vec<Row>` | `row.get("Name")` → `Option` | `None` |

¹ A column under `parent=` on a row it does not apply to — here `Name` on the `F` rows.

**Every value is a string**, in all five: convert before comparing numbers
(`Number(row.Age)`, `int(row["Age"])`, `Integer.parseInt(…)`, `int.Parse(…)`, `.parse::<u32>()`).

**Pin `count` along with `seed`** if a test expects particular values: exact shares and
weighted packs lay the whole run out at once, so the first rows of a 3-row run are not
the first rows of a 50-row one (`reference/core-concepts/determinism.md`).

**Paths.** `path` / `configFile` is relative to the process's working directory — for a
test runner that is usually the project root, but not for `dotnet test` (it runs from
`bin/…`). Build the path from something fixed: the project root, the test file's own
folder, or copy the `.tdc` to the output directory.

## TypeScript / JavaScript

```js
// main.mjs
import { TDC } from "tdcv2";

const rows = new TDC({ configFile: "users.tdc" }).toArray();
console.log(rows.length, rows[0].Name, rows[0].Age);
```

## Python

```python
# main.py
from tdcv2 import TDC

rows = TDC(config_file="users.tdc").to_array()
print(len(rows), rows[0]["Name"], rows[0]["Age"])
```

`TDC(...)` itself is iterable and indexable too — `for row in data`, `data[3]`, `len(data)`.
`count` is a property there, not a method.

## Java

```java
// src/main/java/Main.java
import io.github.nickliapin.tdc.TDC;

public class Main {
    public static void main(String[] args) {
        var rows = new TDC("users.tdc").toArray();
        System.out.println(rows.size() + " " + rows.get(0).get("Name") + " " + rows.get(0).get("Age"));
    }
}
```

The package is `io.github.nickliapin.tdc`, not `…tdcv2`. The version on Maven Central can
lag behind the other four (monthly release cap) — take it from
`reference/bindings/java.md` or Central itself.

## C#

```csharp
// Program.cs
using Tdcv2;

var rows = new Tdc("users.tdc").ToArray();
Console.WriteLine($"{rows.Count} {rows[0]["Name"]} {rows[0]["Age"]}");
```

`ToArray()` returns an `IReadOnlyList<Tdc.Row>`, not an array: `rows.Count`, not
`rows.Length` (CS1061).

## Rust

```rust
// src/main.rs
use tdcv2::Tdc;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let data = Tdc::from_file("users.tdc")?;
    let rows = data.to_array();
    let first = &rows[0];
    println!("{} {} {}", rows.len(), first.get("Name").unwrap_or_default(), first.get("Age").unwrap_or_default());
    Ok(())
}
```

Rows borrow from the `Tdc`: keep it in a variable — `Tdc::from_file(…)?.to_array()`
in one expression does not compile (E0716, temporary dropped while borrowed).

## Loose values instead of records

When a test needs a value here and there — a surname, an email — not whole records,
the one-value API answers from the same packs; seed it so the suite repeats:
`tdc.seed("users").person.lastName()` (TypeScript, Python; the other three:
`reference/getting-started/quick-api.md`). For records whose fields must agree, or exact
shares, use a config.

More per language — options (`count`, `seed`, pinned clock), streaming, one value without
a config: `reference/bindings/<language>.md`.
