# Simple math interpreter

Made up just for fun.

No dependencies needed to run. Just use:
```
node index
```

Supported operators: `+`, `-`, `*`, `/`, `%`. (No unary `-` and `+`!)

You can use variables:
```
> a = 5
  5

> b = 3
  3

> a + b * 2
  11
```
Also has functions support:
```
> fn avg a b => (a + b) / 2

> avg 1.5 2.5
  2

> avg avg 1 3 avg 9 11
  5
```

With great power comes great responsibility.
