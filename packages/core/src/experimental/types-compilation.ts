type CompileError<
  Scope extends string,
  Message extends string
> = `[Compiling ${Scope}] ${Message}`;

type Identity<T> = T;
type Merge<T> = Identity<{ [K in keyof T]: T[K] }>;

type StartIdentifierChars =
  | 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h' | 'i' | 'j' | 'k' | 'l' | 'm'
  | 'n' | 'o' | 'p' | 'q' | 'r' | 's' | 't' | 'u' | 'v' | 'w' | 'x' | 'y' | 'z'
  | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L' | 'M'
  | 'N' | 'O' | 'P' | 'Q' | 'R' | 'S' | 'T' | 'U' | 'V' | 'W' | 'X' | 'Y' | 'Z'
  | '_';

type LeftIdentifierChars = StartIdentifierChars | '-' | '.';

type Whitespace =
  | ' '
  | '\n'
  | '\t';

type ValidCount = {
   '1':  '0',
   '2':  '1',
   '3':  '2',
   '4':  '3',
   '5':  '4',
   '6':  '5',
   '7':  '6',
   '8':  '7',
   '9':  '8',
  '10':  '9',
  '11': '10',
  '12': '11',
  '13': '12',
  '14': '13',
  '15': '14',
  '16': '15',
  '17': '16',
  '18': '17',
  '19': '18',
  '20': '19'
};

type ContextType<Context, Key> =
  Key extends keyof Context
    ? Context[Key] extends infer Value
      ? Value extends (...args: any[]) => any
        ? ReturnType<Value>
        : Value
      : never
    : Key extends object
      ? Key
      : any;

type Compile<Input, Context extends Record<any, any> = {}> =
  CompileRoot<Input, Context> extends infer Result
    ? CompileResult<Result> extends infer Result
      ? Result extends false
        ? CompileError<'Root', 'Expecting object or array'>
        : Result
      : never
    : never;

type CompileValue<Input, Context> =
  CompileRoot<Input, Context> extends infer Result
    ? Result extends false
      ? CompileIdent<Input>
      : Result
    : never;

type CompileRoot<Input, Context> =
  TrimStart<Input> extends `{${infer Properties}`
    ? CompileObject<Properties, Context>
    : TrimStart<Input> extends `[${infer Elements}`
      ? CompileArray<Elements, Context>
      : false;

type CompileResult<Result> =
  Result extends [infer Value, string]
    ? Value
    : Result;

type CompileArray<Elements, Context, Result extends any[] = []> =
  TrimStart<Elements> extends `]${infer Rest}`
    ? [Result, Rest]
    : TrimStart<Elements> extends `(${infer Count})${infer Rest}`
      ? CompileValue<Rest, Context> extends [infer Value, infer Rest]
        ? CompileCount<Value, Context, Count> extends infer CountResult 
          ? CountResult extends any[]
            ? CompileArray<Rest, Context, [...Result, ...CountResult]>
            : CountResult
          : never
        : CompileError<'Array Element', '1 Expecting object, array or identifier'>
      : CompileValue<Elements, Context> extends [infer Value, infer Rest]
        ? CompileArray<Rest, Context, [...Result, ContextType<Context, Value>]>
        : CompileError<'Array Element', '2 Expecting object, array or identifier'>;

type CompileCount<Value, Context, Count = '1', Result extends any[] = []> =
  Count extends '0'
    ? Result
    : Count extends keyof ValidCount
      ? CompileCount<Value, Context, ValidCount[Count], [...Result, ContextType<Context, Value>]>
      : CompileError<'Count', `Invalid array count: '${Count & string}'`>;

type CompileObject<Properties, Context, Result extends Record<string, any> = {}> =
  TrimStart<Properties> extends `}${infer Rest}`
    ? [Result, Rest]
    : CompileIdent<Properties> extends [infer Key, infer Rest]
      ? TrimStart<Rest> extends `:${infer Rest}`
        ? CompileValue<Rest, Context> extends [infer Value, infer Rest]
          ? CompileObject<Rest, Context, Merge<Result & { [K in Key & string]: ContextType<Context, Value> }>>
          : CompileError<'Object Property', '1 Expecting object, array or identifier'>
        : CompileObject<Rest, Context, Merge<Result & { [K in Key & string]: ContextType<Context, Key> }>>
      : CompileError<'Object Property', '2 Expecting object, array or identifier'>;

type CompileIdent<Input> =
  TrimStart<Input> extends `'${infer Ident}'${infer Rest}`
    ? [Ident, Rest]
    : ExtractIdent<Input>;

type ExtractIdent<Input, Result extends string = '', Start = true> =
  Start extends true
    ? TrimStart<Input> extends `${infer StartIdentChar & StartIdentifierChars}${infer Rest}`
      ? ExtractIdent<Rest, `${Result}${StartIdentChar & string}`, false>
      : false
    : Input extends `${infer LeftIdentChar & LeftIdentifierChars}${infer Rest}`
      ? ExtractIdent<Rest, `${Result}${LeftIdentChar & string}`, false>
      : [Result, Input];

type TrimStart<Input> =
  Input extends `${Whitespace}${infer Trimmed}`
    ? TrimStart<Trimmed>
    : Input;

declare function mock<Context extends object, Input extends string>(context: Context, input: Input): Compile<Input, Context>;

const context = {
  name: 'John Doe',
  randomAge () {
    return Math.floor(Math.random() * 100)
  },
  randomFruit () {
    const fruits = [
      'watermelon',
      'strawberry',
      'pineapple',
      'apple'
    ]

    return fruits[Math.floor(Math.random() * fruits.length)]
  }
}

const result = mock(context, `
  [
    (2) {
      name
      age: randomAge
      favoriteFruits: [
        (3) randomFruit
      ]
    }
  ]
`)
