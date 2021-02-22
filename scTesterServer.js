const npmRoot = 
    require('child_process')
    .execSync('npm root -g')
    .toString()
    .trim();

let scRequire = package => 
    require(npmRoot + '/sctester/node_modules/' + package);

scRequire('console.table');
let chalk = scRequire('chalk');
let http = require('http');
let fs = require('fs');
let puppeteer = scRequire('puppeteer'); 
let { performance } = require('perf_hooks');


let testDirectory = './test';
let port = 8083; 

(async () => {

    if (true) {
        // See gidztech on Dec 21, 2018 at
        // https://github.com/puppeteer/puppeteer/issues/3699
        // for a possible way to click on the console tab.
        // If you change his 'indexOf' to 'devtools://' and  
        // condense his query selector to '#tab-network'
        // you can get the 'networkTab'.  But there's no 'click'
        // property and also you really get two devtools tabs.  
        let srv = startServer();
        let browser = await puppeteer.launch({devtools: true});
        let pages = await browser.pages();
        let page = pages[0];    
        page.on('close', () => srv.close())
        await page.goto(`http://127.0.0.1:${port}`);
        return;
    }

    console.log();
    console.log(chalk.bgBlue('Starting SCTester:'));
    console.log();

    let server = startServer();
    let results = [];
    let errors = [];

    for (let file of fs.readdirSync(testDirectory)) {

        let fileFull = `${testDirectory}/${file}`;
        let browserOnly = file.endsWith('.b.js');
        let serverOnly = file.endsWith('.s.js');
        let clientOnly = file.endsWith('.c.js');
        let routeOnly = file.endsWith('.r.js');
        
        if (file.startsWith('_') || !file.endsWith('.js'))
            continue;        

        for (let location of ['client', 'server']) {

            let result = {
                testName: file.replace(/(\.c|\.s)*\.js/, ''),
                location
            };

            try {
                
                let contents = fs.readFileSync(fileFull, 'utf8');

                if (location == 'server') {

                    if (clientOnly || routeOnly || browserOnly)
                        continue;

                    eval(contents);
                    
                    let t0 = performance.now();
                    result.success = (await test()) === true;
                    result.time = performance.now() - t0;

                }

                if (location == 'client') {

                    if (serverOnly || routeOnly || browserOnly)
                        continue;

                    let response = await makeClientRequest(fileFull);
                    if (response.startsWith('error:'))
                        throw response.slice(6);

                    result.success = response.split(';')[0] === 'true';
                    result.time = response.split(';')[1];

                }

                result.time = msToTime(result.time);                

            }
            catch (err) {
                result.success = `err:${errors.length}`;
                errors.push(errorString(err));
            }

            results.push(result);
            
        }
    }

    server.close();

    if(undefined)
        console.log(chalk.red('Errors are suppressed.'));
    else 
        for(let e = 0; e < errors.length; e++) {
            console.log(chalk.red(`ERROR ${e}:`));
            if(!undefined)
                console.log(errors[e]);
        }

    // friendlier formats and headers
    for(let result of results) {
        if (result.time === undefined)
            result.time = '';
        result['hh:mm:ss.f'] = result.time;
        delete result.time;
        result.success = 
            result.success === true
            ? chalk.greenBright(result.success)
            : chalk.red(result.success); 
    }
    
    console.log();
    console.log(chalk.blue.underline(`SCTester-Results:`))
    console.table(results);
    console.log();

    process.exit(results.some(res => !res.success) ? 1 : 0);

})();

async function makeClientRequest (fileName) {

    let browser = await puppeteer.launch({headless: true});
    let page = await browser.newPage();

    let doError = err => 
        page.evaluate(error => {
            let div = document.createElement('div');
            div.id = 'results'; 
            div.innerHTML = `error: ${error}`;
            document.body.appendChild(div);            
        }, errorString(err));

    page.on('pageerror', doError);
    page.on('error', doError); 
    page.on('requestfailed', request => doError(
        `request: ${request.url()}; ` +
        `error: ${request.failure().errorText}`
    ));

    await page.goto(`http://127.0.0.1:${port}/${fileName}`);
    await page.waitForSelector('#results');
    
    let clientResults = await page.evaluate(() => 
        document.querySelector('#results').innerHTML
    );

    await browser.close();
    return clientResults;

}

function startServer () { 
    
    console.log(`server starting on ${port}`);

    return http.createServer((request, response) => {

        // Initializations

            let file = `.${request.url}`;

        // Browser Home: Serve the menu of tests 

            if (file == './') {
                let c = '';
                for(let f of fs.readdirSync(testDirectory)) {
                    if (f.startsWith('_'))
                        continue;
                    c += `<li><a href=${testDirectory}/${f}>${f}</a></li>`
                }
                c = `
                    <p>
                        Click on a link to run a test.  
                        Then check the console.
                    </p>
                    <ul>${c}</ul>
                `;
                response.writeHead(200, { 'Content-Type': 'text/html' });
                response.end(c, 'utf-8');
            }

        // Identify the file type

            let cType =
                file.endsWith('.css') ? 'text/css'
                : file.endsWith('.js') ? 'text/javascript'
                : file.endsWith('.html') ? 'text/html'
                : file.endsWith('.json') ? 'text/json'
                : null;

            if (cType == null) {
                response.writeHead(204);
                response.end();
            }

        // Load the file content

            let content;

            try {
                content = fs.readFileSync(file).toString(); 
            }
            catch (error) {
                response.writeHead(500);
                response.end(error.message);
            }

        // If it's a route file, obey it

            if (file.endsWith('.r.js')) {
                try {
                    eval(content);
                    if(serve == undefined) 
                        throw `${file} did not produce serve()`;
                    serve(request, response);
                    return;
                }
                catch(err) {
                    response.writeHead(500);
                    response.end(err.message);
                }
            }

        // If it's a test file, wrap it's contents
        // in html test running code

            let wrapInHtmlTestCode = 
                file.startsWith(testDirectory) && 
                file.endsWith('.js');

            if (wrapInHtmlTestCode) {

                cType = 'text/html';
                content = `
        
                    <body>
                    <script type = 'module'>
                
                        
                        let errorString = ${errorString}

                        ${content}   

                        let div = document.createElement('div');
                        div.id = 'results'; 

                        let t0 = performance.now();

                        Promise.resolve(test())
                        .then(res => div.innerHTML = res)
                        .then(() => 
                            div.innerHTML += ';' + 
                            (performance.now() - t0)
                        )
                        .catch(err => {
                            console.error(err);
                            div.innerHTML += 'error:' + errorString(err)
                        })
                        .finally(() => document.body.appendChild(div));

                    </script>
                    </body> 
        
                `;

            }

        // Serve the contents

            response.writeHead(200, { 'Content-Type': cType });
            response.end(content, 'utf-8');

    })
    .listen(port);

}

// dusht at stackoverflow.com/questions/19700283
// except that I don't know why he divides ms by 100
function msToTime(duration) {

    let ms = parseInt(duration % 1000);
    let sec = Math.floor((duration / 1000) % 60);
    let min = Math.floor((duration / (1000 * 60)) % 60);
    let hr = Math.floor((duration / (1000 * 60 * 60)) % 24);
  
    hr = hr < 10 ? '0' + hr : hr;
    min = min < 10 ? '0' + min : min;
    sec = sec < 10 ? '0' + sec : sec;
  
    return `${hr}:${min}:${sec}.${ms}`;

}

function errorString (error) {
    let e = '';
    let add = (label, item) => { 
        if (item)
            e += `${label}: ${item};`
    }
    add('type', error.name);
    add('file', error.fileName);
    add('line', error.lineNumber);
    add('message', error.message);
    add('stack', error.stack);
    return e || error;
}

