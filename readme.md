A command-line-interface that prints content to a codeblock in a markdown file using other code in that file -- just like notebooks in R.  Presently processes only javascript. 

Learned that VSCode has notebooks on it's roadmap.  Depending on what that means exactly, this libary may become obsolete.  I hope it does.  But in the meantime, I'm tired of having to always be cutting and pasting when documenting something in markdown, particularly in the early stages of an evolving package.
 
## Getting Started

mdlogger is a CLI, so install it globally.

    npm install mdlogger -g

## Syntax and Options

Mdlogger expects codeblocks to begin and end with triple backtics.  Language (only javascript for now) and options are declared with the following syntax:

    ```language { option1=value, option2=value }
    code
    ```

Currently, mdlogger expects one or more of the following options:

* **id:** An identifier for the block.  Allows it to be referenced as a setup 
  script by other code blocks.
* **setup:** A reference to another code block, to be processed first before the
  present code block.  The reference can be in another file, in which case separate 
  the path and identifier with a colon (e.g.: setup=./test/setup.md:identifier).
* **log:** A boolean indicating whether the codeblock is intended to be tracked 
  for logging purposes.  Most likely, it will have a `console.log` usage in it.
* **output:** A boolean indicating whether the block is intended as the target for
  logged output of a previous block.  It starts out as empty and then gets 
  populated on the run of mdlogger.

When code is set up, execute mdlogger in the console as follows:

    mdlogger 'sourceFile', 'targetFile'

mdlogger will read the source file and outupt the results in the target file.  Both can be the same, in which case the output blocks of the source file are (re)populated.

Mdlogger also has an optional `-c` switch that will convert all triple backtics to invisible comment structures to output to engines that do not work well with language blocks, such as GitHub.

    mdlogger 'sourceFile', 'targetFile' -c

Use of the switch, or going back and forth between using it and not using it, is still in the early stages of development, so there may be issues, particularly with respect to whitespace surrounding the frames.

## Example

### Setup Scripts (Optional)

The following creates a 'setup' script that isn't run itself, but can be utilized in later scripts.

    ```javascript { id=prerequisites }
    let array = [0, 1, 2, 3, 4, 5];
    ```

### Logging Scripts

The following code block takes advantage of the setup script, and it has the code that will actually log the results:

    ```javascript { log=true, setup=prerequisites }
    let multiplier = 5;
    
    for(let i in array)
        array[i] *= multiplier;

    console.log(array);
    ```

### Output Blocks

The following code block was written as an empty block.  However, it was populated at the execution of the mdlogger code shown later on.

    ```javascript { output=true }
    [ 0, 5, 10, 15, 20, 25 ]
    ```

### Execution

At the command line, the following code was run to populate the output block:

    mdlogger 'readme.md' 'readme.md'

### Comment Frames

Adding the `-c` switch:

    mdlogger 'readme.md', 'readme.md' -c

would have converted the blocks to look like:

    [javascript]: # (log=true)
        [ 0, 5, 10, 15, 20, 25 ]
    [--]: # ()

except that the frames would be unindented, meaning that they would be invisible in the final presentation, so only the inner contents are seen.