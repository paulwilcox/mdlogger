let fs = require('fs');
let util = require('util');
let cp = require('child_process');
let = exec = util.promisify(cp.exec);

let args = process.argv.slice(2);
let source = args[0];
let target = args[1];

(async function main() {

    let groups = groupFileLines(source);
    groups = await processCodeGroups(groups);
    let output = rebuildGroups(groups);

    if (target == undefined) {
        console.log({output});
        return;
    }

    fs.writeFileSync(target, output);

}())

function rebuildGroups(groups) {
    let output = '';
    for(let group of groups) {
        output += 
            (group.frameStarter ? group.frameStarter + '\r\n' : '') +
            group.value + '\r\n' + 
            (group.frameEnder ? group.frameEnder + '\r\n' : '')
    }
    return output;
}

async function processCodeGroups (groups) {

    let output = '';

    for(var group of groups) 
        if (group.type == 'code' && group.frameArgs.log == 'true') {

            let setup = '';

            if (output != '')
                output += '\r\n';

            if (group.frameArgs.setup) {
                if(!group.frameArgs.setup.includes(':'))
                    group.frameArgs.setup = 
                        source + ':' + 
                        group.frameArgs.setup;
                let [f,id] = group.frameArgs.setup.split(':');
                setup += getGroupById(f, id).value;
            }

            output += await captureOutput(setup + ';' + group.value);

        }
        else if (group.type == 'code' && group.frameArgs.output == 'true') {
            let leadSpace = group.frameStarter.match(/\s*/);
            group.value = leadSpace + output.replace(/\n/g,'\n' + leadSpace); 
            output = '';
        }

    return groups;

}

function getGroupById (file, id) {
    return groupFileLines(file)
        .find(group => 
            group.frameArgs &&
            group.frameArgs.id && 
            group.frameArgs.id == id
        );
}

function groupFileLines (file) {

    let lines = fs.readFileSync(file)
        .toString()
        .split('\r\n');

    let groups = [];
    let group = { 
        type: 'md', 
        value: null
    };

    for(let line of lines) {

        let isFrameStart = line.trim().startsWith('```')
        let isFrameEnd = line.trim().endsWith('```')

        if (group.type == 'md' && isFrameStart) {
            groups.push(group);
            group = {
                type: 'code',
                frameStarter: line,
                frameArgs: parseFrameArgs(line),
                value: null 
            }
        }
        else if (group.type == 'code' && isFrameEnd) 
            group.frameEnder = line;
        else if (group.type == 'code' && group.frameEnder) {
            groups.push(group);
            group = {
                type: 'md',
                value: line 
            }
        } 
        else {
            group.value == null
                ? group.value = ''
                : group.value += '\r\n';
            group.value += line;
        }

    }

    groups.push(group);

    return groups;
    
}

function parseFrameArgs (str) {
    let match = str.match(/(?<=\{).+(?=\})/mg);
    if (match == null) 
        return null;
    return match[0]
        .split(',')
        .map(s => s.split('='))
        .reduce((obj,sp) => {
            obj[sp[0].trim()] = sp[1].trim();
            return obj;
        }, {});
}

async function captureOutput(script) {
    
    let output = '';
    script = script.replace(/\r\n/gm, ';');    

    await exec(`node -e "${script}"`)
        .then(log => {
            output += log.stdout.trim() + log.stderr.trim();
        })
        .catch(error => {
            console.log('exec error: ' + error);
        });

    return output;

}

