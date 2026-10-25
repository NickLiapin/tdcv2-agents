# Several linked tables in one file

For a database seed: tables of their own sizes that point at each other — authors, books,
members, loans — in one JSON object with an array per table, or as SQL inserts.

## `each` or pools

| the data | use |
| :--- | :--- |
| a parent with a few children printed right under it — a customer and their orders | `repeat=` + `each=` (SKILL.md, "Parent and child tables") |
| tables of their own sizes; many-to-many; one section or array per table; a field of one table shown in another | **pools as tables** — this page |

`each` over a list cannot do the second: the children are a list inside the parent's row,
printed beside it. A [`<pool>`](reference/pools/overview.md) is a table built before the
first row; rows draw whole records from it, so every field of one record stays together
wherever it is printed — and `<line each="Pool">` prints the pool itself, record by record
([a whole pool](reference/constructs/relational-tables.md)).

## The shape

1. **Every table is a `<pool>`** with an `id` (`increment`) and its fields. A link to another
   table is a field drawn from that pool — the linked pool is declared first
   ([linking](reference/pools/linking.md)).
2. **Print a table with `<line each="Pool">` in `<before>`** — one line per record, every field
   as `${{Pool.field}}`, a linked one a level down (`${{Books.author.id}}`). In `<before>` it
   prints once; in `<block>` it would repeat on every row.
3. **Commas and strings:** `<data if="!Pool._last">,</data>` puts a comma between records and
   not after the last; `${{X | json}}` writes a JSON string (quotes, escapes, empty → `null`).
4. **The biggest table is the rows themselves** — `count` is its size. Its references are
   pool draws, and `filter=` keeps them coherent (a member borrows books for their own group).
5. **No repeats where the data forbids them** — a book lent twice the same day, a doctor
   booked twice at one time: turn the row's index into the combination, so no two rows get
   the same one (`K = _count - 1` → book `K % 12`, day `K / 12`; unique while `K` < books ×
   days). With three axes: `K % A`, `floor(K / A) % B`, `floor(K / (A*B)) % C`.
6. **Rules that span tables are `<assert>`s** — paths of any depth work there.

```xml
<tdc>
  <env count="60" seed="library" local="en">
    <pool name="Authors" count="3">
      <sequence name="id"><gen type="increment" value="1"/></sequence>
      <sequence name="name"><gen type="template" value="person.lastName"/></sequence>
    </pool>
    <pool name="Books" count="12">
      <sequence name="id"><gen type="increment" value="1"/></sequence>
      <sequence name="genre"><gen type="template" value="book.genre"/></sequence>
      <sequence name="audience"><gen type="text" value="kids,adults" percent="25,75"/></sequence>
      <sequence name="author"><gen type="pool" value="Authors"/></sequence>
    </pool>
    <pool name="Members" count="30">
      <sequence name="id"><gen type="increment" value="1"/></sequence>
      <sequence name="name"><gen type="template" value="person.lastName"/></sequence>
      <sequence name="group"><gen type="text" value="kids,adults" percent="20,80"/></sequence>
    </pool>
    <pool name="Days" count="5">
      <sequence name="di"><gen type="increment" value="1"/></sequence>
      <sequence name="day"><gen type="date" from="2025-09-01" order="sequential" step="1d" weekdays="mon..fri" format="YYYY-MM-DD"/></sequence>
    </pool>

    <!-- loan K (0..59) → one (book, day), never twice -->
    <sequence name="K"><gen type="formula" expr="_count - 1"/></sequence>
    <sequence name="BookIdx"><gen type="formula" expr="(K % 12) + 1"/></sequence>
    <sequence name="DayIdx"><gen type="formula" expr="floor(K / 12) + 1"/></sequence>
    <sequence name="Book"><gen type="pool" value="Books" filter="id == BookIdx"/></sequence>
    <sequence name="Day"><gen type="pool" value="Days" filter="di == DayIdx"/></sequence>
    <sequence name="Member"><gen type="pool" value="Members" filter="group == Book.audience"/></sequence>
    <assert each="Member.group == Book.audience" says="a member borrows books for their own group"/>

    <before>
      <line><data>{</data></line>
      <line><data>  "authors": [</data></line>
      <line each="Authors"><data>    {"id": ${{Authors.id}}, "name": ${{Authors.name | json}}}</data><data if="!Authors._last">,</data></line>
      <line><data>  ],</data></line>
      <line><data>  "books": [</data></line>
      <line each="Books"><data>    {"id": ${{Books.id}}, "genre": ${{Books.genre | json}}, "audience": ${{Books.audience | json}}, "author_id": ${{Books.author.id}}}</data><data if="!Books._last">,</data></line>
      <line><data>  ],</data></line>
      <line><data>  "members": [</data></line>
      <line each="Members"><data>    {"id": ${{Members.id}}, "name": ${{Members.name | json}}, "group": ${{Members.group | json}}}</data><data if="!Members._last">,</data></line>
      <line><data>  ],</data></line>
      <line><data>  "loans": [</data></line>
    </before>
    <after>
      <line><data>  ]</data></line>
      <line><data>}</data></line>
    </after>
  </env>
  <block>
    <line><data>    {"id": ${{_count}}, "book_id": ${{Book.id}}, "member_id": ${{Member.id}}, "author": ${{Book.author.name | json}}, "day": "${{Day.day}}"}</data><data if="!_last">,</data></line>
  </block>
</tdc>
```

`"author"` in a loan is the book's author, two links away (`Book.author.name`) — the same
record the books table printed, because a pool member is built once.

**A table inside a table** — each department with its own doctors — is `<group each="Depts">`
around the department's lines and a nested `<group each="Doctors" if="Doctors.dept.id == Depts.id">`;
each level counts its own `_last` ([`<group>`](reference/constructs/relational-tables.md)).

**SQL instead of JSON:** `<line each="Pool"><data>INSERT INTO … VALUES (…);</data></line>` per
table in `<before>`, the rows' own `INSERT` in `<block>` — no commas to manage.

**Prove it from the file:** `node <skill>/scripts/peek.mjs <file>` reads an object of arrays
table by table and checks every `<x>_id` against `<x>s.id`; it exits 1 if a link points
nowhere.
