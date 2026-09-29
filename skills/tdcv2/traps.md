# Traps — what `check` does and does not tell you

Every example below was run through `tdcv2` 0.3.3; the `check` lines and outputs are
what the engine printed. Generated from the engine's answers — do not edit by hand.

## Silent — `check` is clean, the data is not what was meant

Nothing tells you about these. Read them before writing a config.

### No `seed` — a different file on every run

Without `seed=` on `<env>` each run draws anew; nothing warns. The whole point of a config is lost.

**Wrong**

```xml
<tdc>
    <env count="3" local="en">
        <sequence name="N">
            <gen type="number" value="1..1000"/>
        </sequence>
    </env>
    <block>
        <line><data>${{N}}</data></line>
    </block>
</tdc>
```

`check`: clean. Two runs give two different files (the numbers change on every build of this page, so they are not shown).

**Right**

```xml
<tdc>
    <env count="3" seed="orders" local="en">
        <sequence name="N">
            <gen type="number" value="1..1000"/>
        </sequence>
    </env>
    <block>
        <line><data>${{N}}</data></line>
    </block>
</tdc>
```

`check`: clean. Two runs, the same output both times:

```
593
760
951
```

### `mm` is minutes, `MM` is the month

Formats are Moment-style. In a date-only range the minutes are always 00 — a month of `00` comes out without a word.

**Wrong**

```xml
<tdc>
    <env count="3" seed="t" local="en">
        <sequence name="D">
            <gen type="date" from="2025-01-01" to="2025-12-31" format="YYYY-mm-DD"/>
        </sequence>
    </env>
    <block>
        <line><data>${{D}}</data></line>
    </block>
</tdc>
```

`check`: clean. Output:

```
2025-00-06
2025-00-15
2025-00-18
```

**Right**

```xml
<tdc>
    <env count="3" seed="t" local="en">
        <sequence name="D">
            <gen type="date" from="2025-01-01" to="2025-12-31" format="YYYY-MM-DD"/>
        </sequence>
    </env>
    <block>
        <line><data>${{D}}</data></line>
    </block>
</tdc>
```

`check`: clean. Output:

```
2025-03-06
2025-07-15
2025-06-18
```

### A `date` without `format` is `MM/DD/YYYY`

Set `format=` whenever the consumer expects ISO or anything else.

**Wrong**

```xml
<tdc>
    <env count="3" seed="t" local="en">
        <sequence name="D">
            <gen type="date" from="2025-01-01" to="2025-12-31"/>
        </sequence>
    </env>
    <block>
        <line><data>${{D}}</data></line>
    </block>
</tdc>
```

`check`: clean. Output:

```
03/06/2025
07/15/2025
06/18/2025
```

**Right**

```xml
<tdc>
    <env count="3" seed="t" local="en">
        <sequence name="D">
            <gen type="date" from="2025-01-01" to="2025-12-31" format="YYYY-MM-DD"/>
        </sequence>
    </env>
    <block>
        <line><data>${{D}}</data></line>
    </block>
</tdc>
```

`check`: clean. Output:

```
2025-03-06
2025-07-15
2025-06-18
```

### `&quot;` in `<data>` stays `&quot;`

TDC is not XML: nothing is expanded. Write the character itself — `"`, `<`, `&` are plain text inside `<data>`.

**Wrong**

```xml
<tdc>
    <env count="3" seed="t" local="en">
        <sequence name="A">
            <gen type="text" value="x"/>
        </sequence>
    </env>
    <block>
        <line><data>{&quot;a&quot;: &quot;${{A}}&quot;}</data></line>
    </block>
</tdc>
```

`check`: clean. Output:

```
{&quot;a&quot;: &quot;x&quot;}
{&quot;a&quot;: &quot;x&quot;}
{&quot;a&quot;: &quot;x&quot;}
```

**Right**

```xml
<tdc>
    <env count="3" seed="t" local="en">
        <sequence name="A">
            <gen type="text" value="x"/>
        </sequence>
    </env>
    <block>
        <line><data>{"a": "${{A}}"}</data></line>
    </block>
</tdc>
```

`check`: clean. Output:

```
{"a": "x"}
{"a": "x"}
{"a": "x"}
```

### `number` is whole unless `decimals=` — `0..1` gives only 0 and 1

A share, a probability, a price needs `decimals=`.

**Wrong**

```xml
<tdc>
    <env count="8" seed="t" local="en">
        <sequence name="P">
            <gen type="number" value="0..1"/>
        </sequence>
    </env>
    <block>
        <line><data>${{P}}</data></line>
    </block>
</tdc>
```

`check`: clean. Output:

```
1
0
1
```

**Right**

```xml
<tdc>
    <env count="8" seed="t" local="en">
        <sequence name="P">
            <gen type="number" value="0..1" decimals="2"/>
        </sequence>
    </env>
    <block>
        <line><data>${{P}}</data></line>
    </block>
</tdc>
```

`check`: clean. Output:

```
0.74
0.31
0.51
```

### Only a comma separates list values

`;` or quotes are kept as part of the value — `"a;b;c"` is one value, `'a'` keeps its quotes.

**Wrong**

```xml
<tdc>
    <env count="3" seed="t" local="en">
        <sequence name="S">
            <gen type="text" value="'red';'green'"/>
        </sequence>
    </env>
    <block>
        <line><data>${{S}}</data></line>
    </block>
</tdc>
```

`check`: clean. Output:

```
'red';'green'
'red';'green'
'red';'green'
```

**Right**

```xml
<tdc>
    <env count="3" seed="t" local="en">
        <sequence name="S">
            <gen type="text" value="red,green"/>
        </sequence>
    </env>
    <block>
        <line><data>${{S}}</data></line>
    </block>
</tdc>
```

`check`: clean. Output:

```
green
red
green
```

### The engine does not know JSON — a comma after every object breaks the array

Put the separator on all but the last record: `<data if="!_last">,</data>`, with `[` / `]` in `<before>` / `<after>`.

**Wrong**

```xml
<tdc>
    <env count="3" seed="t" local="en">
        <before>
            <line><data>[</data></line>
        </before>
        <after>
            <line><data>]</data></line>
        </after>
        <sequence name="A">
            <gen type="increment" value="1"/>
        </sequence>
    </env>
    <block>
        <line><data>{"id": ${{A}}},</data></line>
    </block>
</tdc>
```

`check`: clean. Output:

```
[
{"id": 1},
{"id": 2},
```

**Right**

```xml
<tdc>
    <env count="3" seed="t" local="en">
        <before>
            <line><data>[</data></line>
        </before>
        <after>
            <line><data>]</data></line>
        </after>
        <sequence name="A">
            <gen type="increment" value="1"/>
        </sequence>
    </env>
    <block>
        <line><data>{"id": ${{A}}}</data><data if="!_last">,</data></line>
    </block>
</tdc>
```

`check`: clean. Output:

```
[
{"id": 1},
{"id": 2},
```

## Clean at `check`, refused at the run

### `uniq="true"` on a composed template such as `common.internet.email`

There is no list to draw from without repeats. `tdcv2` 0.3.2 passes it at `check` and refuses at the run; later versions refuse at `check` (TDC218). Put a counter in the value instead.

**Wrong**

```xml
<tdc>
    <env count="3" seed="t" local="en">
        <sequence name="E" uniq="true">
            <gen type="template" value="common.internet.email"/>
        </sequence>
    </env>
    <block>
        <line><data>${{E}}</data></line>
    </block>
</tdc>
```

`check`: TDC218 uniq="true" is not allowed on <sequence name="E">: template "common.internet.email" is a generator — it composes each value when asked instead of listing them, so there are no values to draw without replacement — A counter never repeats, so build the value around one instead of asking for uniq=: <sequence name="Email"><data>user</data><gen type="increment"/><data>@example.test</data></sequence>. Or draw from something that lists its values — a text list, a value-list pack, a file column, a plain integer range, a regex.

**Right**

```xml
<tdc>
    <env count="3" seed="t" local="en">
        <sequence name="E">
            <data>user</data>
            <gen type="increment" value="1"/>
            <data>@example.test</data>
        </sequence>
    </env>
    <block>
        <line><data>${{E}}</data></line>
    </block>
</tdc>
```

`check`: clean. Output:

```
user1@example.test
user2@example.test
user3@example.test
```

## `check` says so — the fix

Agents hit these most often. `check` catches each; the fix is here so it is right the first time.

### `<before>` / `<after>` belong inside `<env>`

**Wrong**

```xml
<tdc>
    <before>
        <line><data>id</data></line>
    </before>
    <env count="2" seed="t">
        <sequence name="A">
            <gen type="increment" value="1"/>
        </sequence>
    </env>
    <block>
        <line><data>${{A}}</data></line>
    </block>
</tdc>
```

`check`: TDC010 unknown child of <tdc>: "<before>" — Allowed inside <tdc>: block, env.

**Right**

```xml
<tdc>
    <env count="3" seed="t" local="en">
        <before>
            <line><data>id</data></line>
        </before>
        <sequence name="A">
            <gen type="increment" value="1"/>
        </sequence>
    </env>
    <block>
        <line><data>${{A}}</data></line>
    </block>
</tdc>
```

`check`: clean. Output:

```
id
1
2
```

### No expressions inside `${{…}}` — conditions go on `if=`

**Wrong**

```xml
<tdc>
    <env count="3" seed="t" local="en">
        <sequence name="A">
            <gen type="increment" value="1"/>
        </sequence>
    </env>
    <block>
        <line><data>${{A}}${{_last ? "" : ","}}</data></line>
    </block>
</tdc>
```

`check`: TDC193 "_last ? "" : ","" is not a declared sequence — it would be printed literally — Declare it in <env>, or set a different inject= pattern if you really want the text ${{…}} in the output.

**Right**

```xml
<tdc>
    <env count="3" seed="t" local="en">
        <sequence name="A">
            <gen type="increment" value="1"/>
        </sequence>
    </env>
    <block>
        <line><data>${{A}}</data><data if="!_last">,</data></line>
    </block>
</tdc>
```

`check`: clean. Output:

```
1,
2,
3
```

### Inside `if=` / `each=` / `that=` a column is its bare name

**Wrong**

```xml
<tdc>
    <env count="3" seed="t" local="en">
        <sequence name="A">
            <gen type="number" value="1..9"/>
        </sequence>
    </env>
    <block>
        <line><data>${{A}}</data><data if="${{A}} > 5">!</data></line>
    </block>
</tdc>
```

`check`: TDC100 invalid if expression "${{A}} > 5": Unexpected "{" at character 1 — See the operator table: https://nickliapin.github.io/tdcv2/docs/core-concepts/output-formatting

**Right**

```xml
<tdc>
    <env count="3" seed="t" local="en">
        <sequence name="A">
            <gen type="number" value="1..9"/>
        </sequence>
    </env>
    <block>
        <line><data>${{A}}</data><data if="A > 5">!</data></line>
    </block>
</tdc>
```

`check`: clean. Output:

```
6!
4
4
```

### Strings in `if=` use single quotes, not `&quot;`

**Wrong**

```xml
<tdc>
    <env count="3" seed="t" local="en">
        <sequence name="S">
            <gen type="text" value="shipped,pending"/>
        </sequence>
    </env>
    <block>
        <line><data>${{S}}</data><data if="S == &quot;shipped&quot;"> *</data></line>
    </block>
</tdc>
```

`check`: TDC100 invalid if expression "S == &quot;shipped&quot;": nothing is expanded here, so "&quot;" is 6 literal characters, not """ — write " directly — TDC reads the characters as typed, and the raw character is what the expression parser reads

**Right**

```xml
<tdc>
    <env count="3" seed="t" local="en">
        <sequence name="S">
            <gen type="text" value="shipped,pending"/>
        </sequence>
    </env>
    <block>
        <line><data>${{S}}</data><data if="S == 'shipped'"> *</data></line>
    </block>
</tdc>
```

`check`: clean. Output:

```
pending
shipped *
pending
```

### Operators are written as they are — `<`, `>=`, `&&` — never `&lt;`, `&gt;`, `&amp;&amp;`

It looks like XML and is not: attribute values are expressions, read as typed. The same holds in `<data>`, where `<`, `>` and `&` are plain characters.

**Wrong**

```xml
<tdc>
    <env count="3" seed="t" local="en">
        <sequence name="A">
            <gen type="number" value="1..20"/>
        </sequence>
        <assert each="A &gt;= 1 &amp;&amp; A &lt;= 20" says="in range"/>
    </env>
    <block>
        <line><data>${{A}}</data></line>
    </block>
</tdc>
```

`check`: TDC100 invalid if expression "A &gt;= 1 &amp;&amp; A &lt;= 20": nothing is expanded here, so "&lt;" is 4 literal characters, not "<" — write < directly — TDC reads the characters as typed, and the raw character is what the expression parser reads

**Right**

```xml
<tdc>
    <env count="3" seed="t" local="en">
        <sequence name="A">
            <gen type="number" value="1..20"/>
        </sequence>
        <assert each="A >= 1 && A <= 20" says="in range"/>
    </env>
    <block>
        <line><data><td>${{A}}</td></data><data if="A < 5 || A >= 15"> edge</data></line>
    </block>
</tdc>
```

`check`: clean. Output:

```
<td>13</td>
<td>9</td>
<td>8</td>
```

### `==`, `!=`, `&&`, `||`, `!` — not `=`, `<>`, `and`, `or`, `not`

**Wrong**

```xml
<tdc>
    <env count="3" seed="t" local="en">
        <sequence name="S">
            <gen type="text" value="a,b"/>
        </sequence>
    </env>
    <block>
        <line><data>${{S}}</data><data if="S <> 'a' and S = 'b'"> B</data></line>
    </block>
</tdc>
```

`check`: TDC100 invalid if expression "S <> 'a' and S = 'b'": Expected expression after < at character 3 — See the operator table: https://nickliapin.github.io/tdcv2/docs/core-concepts/output-formatting

**Right**

```xml
<tdc>
    <env count="3" seed="t" local="en">
        <sequence name="S">
            <gen type="text" value="a,b"/>
        </sequence>
    </env>
    <block>
        <line><data>${{S}}</data><data if="S != 'a' && S == 'b'"> B</data></line>
    </block>
</tdc>
```

`check`: clean. Output:

```
b B
a
b B
```

### `each=` needs a list — `repeat=` on the child column's `<gen>`

**Wrong**

```xml
<tdc>
    <env count="2" seed="t">
        <sequence name="Id">
            <gen type="increment" value="1"/>
        </sequence>
        <sequence name="Order">
            <gen type="number" value="1..9"/>
        </sequence>
    </env>
    <block>
        <line each="Order"><data>${{Id}},${{Order}}</data></line>
    </block>
</tdc>
```

`check`: TDC207 each="Order" — that sequence holds one value, not a list — Add repeat= to its <gen>, e.g. <gen … repeat="1..5"/>, or drop each=.

**Right**

```xml
<tdc>
    <env count="2" seed="t">
        <sequence name="Id">
            <gen type="increment" value="1"/>
        </sequence>
        <sequence name="Order">
            <gen type="number" value="1..9" repeat="1..3"/>
        </sequence>
    </env>
    <block>
        <line each="Order"><data>${{Id}},${{Order}}</data></line>
    </block>
</tdc>
```

`check`: clean. Output:

```
1,2
1,4
1,8
```

### A `<sequence>` cannot be built from other columns' `${{…}}`

A composed sequence glues its own `<gen>`s with `<data>`; to combine existing columns, do it in `<block>`.

**Wrong**

```xml
<tdc>
    <env count="3" seed="t" local="en">
        <sequence name="F">
            <gen type="text" value="Ann"/>
        </sequence>
        <sequence name="Full">
            <data>${{F}} Lee</data>
        </sequence>
    </env>
    <block>
        <line><data>${{Full}}</data></line>
    </block>
</tdc>
```

`check`: TDC036 <sequence name="Full"> has no <gen> child — A sequence needs at least one <gen type="…"/> describing how values are produced. For a percentage distribution use a standalone <mix name="…"> in <env>.

**Right**

```xml
<tdc>
    <env count="3" seed="t" local="en">
        <sequence name="Full">
            <gen type="text" value="Ann"/>
            <data> </data>
            <gen type="text" value="Lee"/>
        </sequence>
    </env>
    <block>
        <line><data>${{Full}}</data></line>
    </block>
</tdc>
```

`check`: clean. Output:

```
Ann Lee
Ann Lee
Ann Lee
```

## Holds, though it is easy to doubt

### A range includes both ends

**Example**

```xml
<tdc>
    <env count="40" seed="t" local="en">
        <sequence name="R">
            <gen type="number" value="1..2"/>
        </sequence>
    </env>
    <block>
        <line><data>${{R}}</data></line>
    </block>
</tdc>
```

`check`: clean. Output:

```
1
2
2
```

### A list without `percent` is split in exactly equal shares

**Example**

```xml
<tdc>
    <env count="12" seed="t" local="en">
        <sequence name="C">
            <gen type="text" value="a,b,c"/>
        </sequence>
    </env>
    <block>
        <line><data>${{C}}</data></line>
    </block>
</tdc>
```

`check`: clean. Output:

```
c
c
a
```
