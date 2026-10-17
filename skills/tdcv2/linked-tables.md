# Several linked tables in one file

For a database seed: tables of their own sizes that point at each other — authors, books,
members, loans — in one JSON object with an array per table, or as SQL inserts.

## `each` or pools

| the data | use |
| :--- | :--- |
| a parent with a few children printed right under it — a customer and their orders | `repeat=` + `each=` (SKILL.md, "Parent and child tables") |
| tables of their own sizes; many-to-many; one section or array per table; a field of one table shown in another | **pools as tables** — this page |

`each` cannot do the second: the children are a list inside the parent's row, printed
beside it. A [`<pool>`](reference/pools/overview.md) is a table built before the first row;
rows draw whole records from it, so every field of one record stays together wherever it
is printed.

## The shape

1. **Every table is a `<pool>`** with an `id` (`increment`) and its fields. A link to another
   table is a field drawn from that pool — the linked pool is declared first
   ([linking](reference/pools/linking.md)).
2. **`count` of `<env>` is the sum of the tables' sizes**, and the row number `_count` says
   which table a row prints (`T` below).
3. **A table row prints one record**: `filter="id == Key"`, with the key kept in range by
   `%` on every row, so the lookup always finds a member.
4. **The last table can be the plain rows** — here the loans; their references are pool
   draws, and `filter=` keeps them coherent (a member borrows books for their own group).
5. **No repeats where the data forbids them** — a book lent twice the same day, a doctor
   booked twice at one time: turn the row's index into the combination, so no two rows get
   the same one (`BookIdx`, `DayIdx`: index `K` → book `K % 12`, day `K / 12`; unique while
   `K` < books × days). With three axes: `K % A`, `floor(K / A) % B`, `floor(K / (A*B)) % C`.
6. **JSON sections**: an opening line on a table's first row, a comma on every row but the
   table's last, a closing line on its last row; `<before>`/`<after>` hold the braces.
7. **Rules that span tables are `<assert>`s** — paths of any depth work there.

```xml
<tdc>
  <env count="105" seed="library" local="en">
    <before><line><data>{</data></line></before>
    <after><line><data>}</data></line></after>

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

    <!-- rows 1-3 authors, 4-15 books, 16-45 members, 46-105 loans -->
    <sequence name="T"><gen type="formula" expr="_count <= 3 ? 1 : (_count <= 15 ? 2 : (_count <= 45 ? 3 : 4))"/></sequence>
    <sequence name="AKey"><gen type="formula" expr="((_count + 2) % 3) + 1"/></sequence>
    <sequence name="BKey"><gen type="formula" expr="((_count + 8) % 12) + 1"/></sequence>
    <sequence name="MKey"><gen type="formula" expr="((_count + 14) % 30) + 1"/></sequence>
    <sequence name="RAuthor"><gen type="pool" value="Authors" filter="id == AKey"/></sequence>
    <sequence name="RBook"><gen type="pool" value="Books" filter="id == BKey"/></sequence>
    <sequence name="RMember"><gen type="pool" value="Members" filter="id == MKey"/></sequence>

    <!-- loan K (0..59) → one (book, day), never twice -->
    <sequence name="K"><gen type="formula" expr="(_count + 14) % 60"/></sequence>
    <sequence name="LoanId"><gen type="formula" expr="K + 1"/></sequence>
    <sequence name="BookIdx"><gen type="formula" expr="(K % 12) + 1"/></sequence>
    <sequence name="DayIdx"><gen type="formula" expr="floor(K / 12) + 1"/></sequence>
    <sequence name="LBook"><gen type="pool" value="Books" filter="id == BookIdx"/></sequence>
    <sequence name="LDay"><gen type="pool" value="Days" filter="di == DayIdx"/></sequence>
    <sequence name="LMember"><gen type="pool" value="Members" filter="group == LBook.audience"/></sequence>

    <assert each="LMember.group == LBook.audience" says="a member borrows books for their own group"/>
  </env>
  <block>
    <line if="_count == 1"><data>  "authors": [</data></line>
    <line if="T == 1"><data>    {"id": ${{RAuthor.id}}, "name": "${{RAuthor.name}}"}</data><data if="_count != 3">,</data></line>
    <line if="_count == 3"><data>  ],</data></line>
    <line if="_count == 4"><data>  "books": [</data></line>
    <line if="T == 2"><data>    {"id": ${{RBook.id}}, "genre": "${{RBook.genre}}", "audience": "${{RBook.audience}}", "author_id": ${{RBook.author.id}}}</data><data if="_count != 15">,</data></line>
    <line if="_count == 15"><data>  ],</data></line>
    <line if="_count == 16"><data>  "members": [</data></line>
    <line if="T == 3"><data>    {"id": ${{RMember.id}}, "name": "${{RMember.name}}", "group": "${{RMember.group}}"}</data><data if="_count != 45">,</data></line>
    <line if="_count == 45"><data>  ],</data></line>
    <line if="_count == 46"><data>  "loans": [</data></line>
    <line if="T == 4"><data>    {"id": ${{LoanId}}, "book_id": ${{LBook.id}}, "member_id": ${{LMember.id}}, "author": "${{LBook.author.name}}", "day": "${{LDay.day}}"}</data><data if="!_last">,</data></line>
    <line if="_last"><data>  ]</data></line>
  </block>
</tdc>
```

`"author"` in a loan is the book's author, two links away (`LBook.author.name`) — the same
record the books table printed, because a pool member is built once.

**Changing a size** moves its boundaries: `count`, the ranges in `T`, the `+ n` in its key,
the opening, comma and closing lines. Write the boundaries down in a comment first.

**SQL instead of JSON** is simpler: one `INSERT INTO <table> … ;` line per `T`, no commas or
sections to manage.

**Prove it from the file:** `node <skill>/scripts/peek.mjs <file>` reads an object of arrays
table by table and checks every `<x>_id` against `<x>s.id`; it exits 1 if a link points
nowhere.
