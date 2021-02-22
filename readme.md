A command-line-interface that prints content to a codeblock (or 'chunk') in a markdown file using other code in that file -- just like notebooks in R.  Presently processes only javascript. 

If you have been using mdLogger, here are the recent changes
    - You can now do more than one 'setup'
    - The 'setup' option can be in an 'output' block, if you want.

## Installation

mdlogger is a CLI, so install it globally.

    npm install mdlogger -g

## Syntax

Mdlogger expects codeblocks (or 'chunks') to begin and end with triple backtics.  
Language (only javascript for now) and options are declared with the following 
syntax:

    ```language { option1=value, option2=value }
    code (or leave empty if it's an output block)
    ```

Currently, mdlogger expects one or more of the following options:

* **log:** Boolean.  If true, appends the chunk to a cache to be processed later on. 
* **output:** Boolean.  If true, executes the cache from previous 'log' chunks.
* **id:** String, optional.  An identifier for the chunk.
* **setup:** String or array, optional.  A reference to another chunk id.

When code chunks are is set up, execute mdlogger in the console as follows:

    mdlogger 'sourceFile.md', 'targetFile.md'

mdlogger will read the source file and outupt the results in the target file.  Both can be the same, in which case the output blocks of the source file are (re)populated.

If you wish to work with an engine that doesn't treat the '```' as you like, such as github,
you can add the optional '-c' switch to frame code with comment blocks that will not be seen
in the final presentation.  See below for more details.

## Examples

### Registering code and executing it with 'log' and 'output'

Here is some code that, due to `log=true`, is registered for 
future output capture.

    ```javascript {log=true}
    let array = [1,2,3,4];

    console.log(array.map(x => x*x));
    console.log('Was that cool or what?');
    ```

And here is some further code that is registered.

    ```javascript {log=true}
    console.log('I think it was.');
    ```

And here, due to `output=true`, the code is processed when
you run mdLogger, and the results are placed in this 
code block, which was originally empty:

    ```javascript {output=true}    
    [ 1, 4, 9, 16 ]
    Was that cool or what?
    I think it was.
    ```

Now, the log has been cleared.  It starts again.

    ```javascript {log=true}
    let people = {
        'Tamara': { age: 60, gender: 'F' },
        'Timothy': { age: 62, gender: 'M' }
    }    
    console.table(people);
    ```

And in this output you'll notice that only the code 
registered after the last output is processed:

    ```javascript {output=true}    
    ┌─────────┬─────┬────────┐
    │ (index) │ age │ gender │
    ├─────────┼─────┼────────┤
    │ Tamara  │ 60  │  'F'   │
    │ Timothy │ 62  │  'M'   │
    └─────────┴─────┴────────┘
    ```

### Referencing another code chunk with 'id' and 'setup'

There may be some code that you need to reference in multiple
blocks, even if an output block intervenes before that setup
code.

No problem!  Just give a code block an 'id' and reference 
that id in another block using 'setup'.

Here's some setup code to be referenced later:

    ```javascript {id=A}
    function A (text) {
        console.log(`A says '${text}'.`);
    }
    ```

    ```javascript {id=B}
    function B (text) {
        console.log(`B says '${text}'.`);
    }
    ```

Here's some code that clears the log cache:

    ```javascript {log=true}
    console.log('Hey there!');
    ```

    ```javascript {output=true}    
    Hey there!
    ```

Here's some code that seeks to reference the function
in code-block 'A'.  Usually it would be unavailable at
this point, but because of the 'setup' property, it 
comes into scope.  

    ```javascript {log=true,setup=A}
    A('Alan aids an aligator');
    ```

You do not repeat the same setup in future chunks, unless 
for some reason you want that code duplicated.

    ```javascript {log=true}
    A('and an allosaurus awes again');
    ```

    ```javascript {output=true}    
    A says 'Alan aids an aligator'.
    A says 'and an allosaurus awes again'.
    ```

All setups come before any code, even if they're referenced
later.  You can even make your references in the output 
chunk, and you can reference multiple files using array
notation:

    ```javascript {log=true}
    A('always angry at ampitheatres');
    B('but baloons by beaches bounce beautifully');
    ```

    ```javascript {output=true,setup=[A,B]}
    A says 'always angry at ampitheatres'.
    B says 'but baloons by beaches bounce beautifully'.
    ```

### Referencing a code chunk in another file

If you desire to reference a code chunk outside the existing 
file, you can do so.  Below, the `mother` array is in
setup.md.

    ```javascript {log=true, setup=setup.md:mother}
    console.log(mother.map(x => -x));
    ```

That results in:

    ```javascript {output=true}
    [
      -0, -1, -2, -3, -4,
      -5, -6, -7, -8, -9
    ]
    ```

## The '-c' switch 

Mdlogger also has an optional `-c` switch that will convert all triple backtics to invisible comment structures to output to engines that do not work well with language blocks, such as GitHub.

Adding the `-c` switch:

    mdlogger 'sourceFile.md', 'targetFile.md' -c

would have converted the blocks to look like:

    ` [javascript]: # (log=true)
    `    let arr = [ 0, 5, 10, 15, 20, 25 ]
    ` [--]: # ()

except without the indentation and leading backticks. Such comment blocks become invisible in the final presentation, so only the inner contents are seen:

    let arr = [ 0, 5, 10, 15, 20, 25 ]

See [readme.commentFrames.md](readme.commentFrames.md) to see this readme file as processed with the `-c` switch.





