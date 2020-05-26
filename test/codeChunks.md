To run the javascript chunks below and fill in the output chunks,
run this code in the console:

    mdLogger './test/codeChunks.md' '/.test/output.md'

Here is some sample javascript code:

    ```javascript {log=true}
    let array = [1,2,3,4];

    console.log(array.map(x => x*x));
    console.log('Was that cool or what?');
    ```

If you were to run it, it would result in:

    ```javascript {output=true}    
    ```

But let's pull from another file:

    ```javascript {setup=./test/setup.md:mother, log=true}
    console.log(mother.map(x => -x));
    ```

That results in:

    ```javascript {output=true}
    ```
