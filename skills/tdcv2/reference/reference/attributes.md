# Attributes reference

Every attribute in the tag DSL, with a one-line description and where it's covered.

The `<compute>` tags have attributes of their own (`v`, `sep`, `as`, `width`, `fill`,
`from`, `to`, `size`, `pattern`, `default`). Each one belongs to a single tag and is
covered where that tag is explained — see the [compute reference](compute.md).

## Environment & config

| Attribute       | What it sets                                  | See                                                           |
| :-------------- | :-------------------------------------------- | :------------------------------------------------------------ |
| `version` / `v` | The DSL version the file requires             | [Configuration](../core-concepts/configuration.md)           |
| `count`         | Number of records                             | [Determinism](../core-concepts/determinism.md)               |
| `seed`          | RNG seed, for reproducibility                 | [Determinism](../core-concepts/determinism.md)               |
| `local`         | Locale for template data — on `<env>` for the whole run, and on one `<gen type="template">` to override it for that sequence alone | [Template](../generators/template.md)                        |
| `inject`        | Custom interpolation marker                   | [Output & formatting](../core-concepts/output-formatting.md) |
| `mode`          | `memory` / `disk` — which engine family; `stream` is a legacy alias that forces engine 2; `sequential` is a fourth value that `prev()` requires | [Large outputs](../guides/large-outputs.md), [Expressions](expressions.md#a-column-that-reads-its-own-past) |
| `engine`        | `1` / `2` / `3` — force one engine (advanced) | [Large outputs](../guides/large-outputs.md)                  |
| `comment`       | Free-form comment                             | [Configuration](../core-concepts/configuration.md#comment)   |

## Sequences & dependencies

| Attribute   | What it sets                                                                                                                                                | See                                                                  |
| :---------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------- |
| `name`      | On `<sequence>`: its name. On `<gen>`: makes it a field, `Sequence.Field`. On `<data>` inside a sequence: a constant field, the only one that costs no draw | [Sequences](../core-concepts/sequences.md#a-constant-field)         |
| `parent`    | Parent filter, `Parent.Value`                                                                                                                               | [Hierarchical dependencies](../guides/hierarchical-dependencies.md) |
| `uniq`      | Combination that must be unique across all rows                                                                                                             | [Unique values](../constructs/unique-values.md)                     |
| `on` / `is` | Subject / branch key for `<switch>`                                                                                                                         | [Switch](../constructs/switch.md)                                   |
| `filter`    | On `<gen type="pool">`: which members this row may draw from                                                                                                | [Coherent records](../pools/filter.md)                              |
| `of`        | On `<gen type="running">`: the column to accumulate. On `<gen type="stat">`: the column to summarise. On `<gen type="date">`: the column to measure from                                                        | [Running total](../generators/running.md), [Statistic](../generators/stat.md) |
| `plus`      | On `<gen type="date" of="…">`: how far from that column — `7d`, `3..10d`, `1..3mo`, `-10..-3d`; a bare number means days                                     | [An interval](../generators/date.md#an-interval-a-date-measured-from-another-date) |
| `op`        | On `<gen type="stat">`: which statistic — `sum`, `mean`, `median`, `min`, `max`, `count` or `stddev`                                                        | [Statistic](../generators/stat.md)                                  |
| `expr`      | On `<gen type="formula">`: the arithmetic this column is, written the way an `if=` condition is written                                                        | [Formula](../generators/formula.md)                                 |
| `that`      | On `<assert>`: the condition the finished run must satisfy, in the `if=` language                                                                            | [Self-checking configs](../constructs/self-checking.md)             |
| `says`      | On `<assert>`: the sentence a reader is given when it does not hold                                                                                         | [Self-checking configs](../constructs/self-checking.md)             |
| `reset`     | On `<gen type="running">`: a column whose change restarts the total                                                                                         | [Running total](../generators/running.md)                           |

## Generator values

| Attribute             | What it sets                                                                              | See                                                                                                       |
| :-------------------- | :---------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------- |
| `type`                | Which generator to use                                                                    | [Generators](../generators/overview.md)                                                                  |
| `value`               | The generator's main value (type-specific)                                                | [Generators](../generators/overview.md)                                                                  |
| `percent`             | Exact distribution of the values                                                          | [Text](../generators/text.md)                                                                            |
| `accumulate`          | Replace a `repeat` list with its running total, or say how a `running` column accumulates | [Several values in a cell](../constructs/multiple-values.md#accumulate--a-running-total-across-the-list) |
| `alphabet`            | Named Unicode alphabet                                                                    | [Symbol](../generators/symbol.md)                                                                        |
| `length`              | Output length or width                                                                    | [Number](../generators/number.md)                                                                        |
| `first_zero`          | Allow a leading zero                                                                      | [Number](../generators/number.md)                                                                        |
| `weekdays`            | Which weekdays a walked date axis keeps: `mon..fri`, `sun,wed`                            | [Date](../generators/date.md)                                                                          |
| `step`                | Counter stride, or how far a walked date axis advances: `15m`, `1h30m`, `3mo`             | [Counters](../generators/counters.md), [Date](../generators/date.md)                                     |
| `regex_max_length`    | Length cap for a regex                                                                    | [Regex](../generators/regex.md)                                                                          |
| `include` / `exclude` | Keep or drop values from the pool                                                         | [Number](../generators/number.md)                                                                        |
| `decimals`            | Digits after the decimal point                                                            | [Number](../generators/number.md)                                                                        |
| `oldest` / `youngest` | Birthday age window                                                                       | [Date](../generators/date.md)                                                                            |
| `format`              | Date output format                                                                        | [Date](../generators/date.md)                                                                            |
| `from` / `to`         | Range endpoints, given separately                                                         | [Date](../generators/date.md)                                                                            |
| `precision`           | Step size for a date-time range                                                           | [Date](../generators/date.md)                                                                            |
| `range`               | Date range for `date.range`                                                               | [Template](../generators/template.md)                                                                    |

## Statistical shape

| Attribute        | What it sets                             | See                                                      |
| :--------------- | :--------------------------------------- | :------------------------------------------------------- |
| `distribution`   | Named distribution (`normal`, `zipf`, …) | [Distributions](../guides/statistical-distributions.md) |
| `min` / `max`    | Clip the drawn values to a range         | [Distributions](../guides/statistical-distributions.md) |
| `missing`        | Share of rows left empty                 | [Missing data](../guides/missing-data.md)               |
| `missing_as`     | How an empty cell is written             | [Missing data](../guides/missing-data.md)               |
| `missing_when`   | Which rows may go missing (MAR / MNAR)   | [Missing data](../guides/missing-data.md)               |
| `anomaly`        | Share of rows turned into outliers       | [Anomalies](../guides/anomalies.md)                     |
| `anomaly_factor` | How far an outlier is pushed             | [Anomalies](../guides/anomalies.md)                     |
| `anomaly_flag`   | Answer column that marks the outliers    | [Anomalies](../guides/anomalies.md)                     |

**Each distribution takes its own parameters**, and they are only read when
`distribution=` names that one. Every distribution also accepts `decimals`, `min`
and `max`. Each is explained, with a histogram, on the
[distributions guide](../guides/statistical-distributions.md).

| `distribution=` | Parameters        | What they mean                                                                          |
| :-------------- | :---------------- | :-------------------------------------------------------------------------------------- |
| `normal`        | `mean` `sd`       | The centre and the spread                                                               |
| `lognormal`     | `meanlog` `sdlog` | The centre and spread **of the logarithm** — the value itself is skewed right           |
| `exponential`   | `rate`            | Events per unit of time; the mean is `1/rate`                                           |
| `pareto`        | `alpha` `xmin`    | Tail thickness, and the smallest possible value                                         |
| `weibull`       | `shape` `scale`   | `shape` below 1 = early failures, above 1 = wear-out; `scale` sets the typical lifetime |
| `poisson`       | `lambda`          | Average count per interval (capped at 700)                                              |
| `zipf`          | `n` `s`           | How many ranks, and how steeply they fall off                                           |
| `gamma`         | `shape` `scale`   | Total wait for `shape` events that each take `scale` on average                         |
| `beta`          | `alpha` `beta`    | Pull toward 1 and toward 0 — the result is between 0 and 1                              |

## Timeseries

| Attribute   | What it sets                 | See                                        |
| :---------- | :--------------------------- | :----------------------------------------- |
| `base`      | Starting level of the series | [Timeseries](../generators/timeseries.md) |
| `trend`     | Drift per step               | [Timeseries](../generators/timeseries.md) |
| `period`    | Length of one seasonal cycle | [Timeseries](../generators/timeseries.md) |
| `amplitude` | Height of the seasonal swing | [Timeseries](../generators/timeseries.md) |
| `peak_at`   | Which row the seasonal wave peaks on | [Timeseries](../generators/timeseries.md) |
| `noise`     | Random jitter added on top   | [Timeseries](../generators/timeseries.md) |
| `noise_correlation` | How much of one row's jitter carries into the next | [Timeseries](../generators/timeseries.md) |

## Pattern (a drawing as the source)

| Attribute         | What it sets                                         | See                                  |
| :---------------- | :--------------------------------------------------- | :----------------------------------- |
| `points`          | Inline `x,y` pairs instead of a file                 | [Pattern](../generators/pattern.md) |
| `upper` / `lower` | Two boundary curves — a corridor                     | [Pattern](../generators/pattern.md) |
| `mode`            | `signal` (a trajectory) / `density` (a distribution) | [Pattern](../generators/pattern.md) |
| `y_range`         | `min..max` — the vertical scale (**required**)       | [Pattern](../generators/pattern.md) |
| `fit`             | `low..high` — where a drawing from `src` lands       | [Pattern](../generators/pattern.md) |
| `interp`          | `linear` / `smooth` / `step` between points          | [Pattern](../generators/pattern.md) |
| `spread`          | Widen the line into a band of ±N                     | [Pattern](../generators/pattern.md) |
| `ink_threshold`   | How dark a PNG pixel has to be to count as ink       | [Pattern](../generators/pattern.md) |

`mode` is really three different readings that share a name. On `<env>` it does two jobs:
`memory` / `disk` pick the engine family, while `sequential` is a promise about row ORDER —
row N is computed after row N−1, which is what `prev()` needs and what pins the run to
engine 1. On a `pattern` generator it picks what you're asking the drawing for.

The CLI's `--mode` covers only the engine-family half: `--mode memory` and `--mode disk` are
the whole set, so `sequential` is reachable from the config and nowhere else.

## Files & CSV

| Attribute   | What it sets                       | See                                          |
| :---------- | :--------------------------------- | :------------------------------------------- |
| `src`       | Path to a data file                | [File](../generators/file.md)               |
| `column`    | CSV column (name or number)        | [File](../generators/file.md)               |
| `header`    | Skip the first CSV row             | [File](../generators/file.md)               |
| `delimiter` | CSV separator                      | [File](../generators/file.md)               |
| `row`       | Linked-row key                     | [File](../generators/file.md)               |
| `weight`    | Frequency column for weighted rows | [Coherent data](../guides/coherent-data.md) |
| `read`      | `"quantile"` — read the file as a sorted sample and land anywhere on it | [File](../generators/file.md) |
| `sample`    | `"exact"` — sweep that distribution evenly instead of drawing from it | [File](../generators/file.md) |

## HTTP service

| Attribute  | What it sets                                            | See                                    |
| :--------- | :------------------------------------------------------ | :------------------------------------- |
| `src`      | Service URL (the same attribute as the file path above) | [HTTP service](../generators/http.md) |
| `in`       | Sequence whose value is sent with each row              | [HTTP service](../generators/http.md) |
| `on_error` | `fail` (default) or `empty` when a request fails        | [HTTP service](../generators/http.md) |
| `timeout`  | Seconds to wait for a response (default 30)             | [HTTP service](../generators/http.md) |
| `secret`   | Key each request is signed with — `env:`, `file:` or a literal | [HTTP service](../generators/http.md#proving-the-request-came-from-tdc) |

## Output & formatting

| Attribute              | What it sets                               | See                                                           |
| :--------------------- | :----------------------------------------- | :------------------------------------------------------------ |
| `if`                   | Display condition (an expression)          | [Output & formatting](../core-concepts/output-formatting.md) |
| `pair`                 | Paired marker for a literal `</data>`      | [Output & formatting](../core-concepts/output-formatting.md) |
| `mask`                 | Display mask (`x`/`w`/`*`)                 | [Masks & case](../guides/masks-and-case.md)                  |
| `case`                 | Letter case (`upper`/`lower`/…)            | [Masks & case](../guides/masks-and-case.md)                  |
| `order`                | Value order (`random` / `sequential`) — `text`, `file` and `date` only | [Generators](../generators/overview.md)                      |
| `cycle`                | With `sequential`: cycle or raise an error — the same three types | [Generators](../generators/overview.md)                      |
| `repeat` / `separator` | Several values in one cell                 | [Multiple values](../constructs/multiple-values.md)          |
| `lengths`   | Beside `repeat="A..B"`: the share of rows that get each possible length, `A` first — an exact quota, not an approximation                                                        | [Multiple values](../constructs/multiple-values.md)                  |
| `distinct` | No repeats inside one cell (needs `repeat`) | [Multiple values](../constructs/multiple-values.md)          |
| `each`                 | Repeat a line for each list element; on `<assert>`, a condition every row must satisfy | [Relational tables](../constructs/relational-tables.md), [Self-checking configs](../constructs/self-checking.md) |
| `flag`                 | Answer column that marks `<mix>` outliers  | [Mix](../constructs/mix.md#marking-outliers-with-flag)       |
