To run the javascript chunks below and fill in the output chunks,
run this code in the console:

    mdLogger './test/codeChunks.md' './test/output.md'

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
you run mdLogger, and the results are palced in this 
code block:

    ```javascript {output=true}    
    ```

Now, the log has been cleared.  It starts again.

    ```javascript {log=true}
    let people = [
        { name: 'Tamara', age: 60 },
        { name: 'Timothy', age: 62 }
    ]
    console.table(people);
    ```

And in this output you'll notice that only the code 
registered after the last output is processed:

    ```javascript {output=true}    
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
    ```

### Referencing a code chunk in another file

If you desire to reference a code chunk outside the existing 
file, you can do so.  Below, the `mother` array is in
./test/setup.md.

    ```javascript {log=true, setup=./test/setup.md:mother}
    console.log(mother.map(x => -x));
    ```

That results in:

    ```javascript {output=true}
    ```
