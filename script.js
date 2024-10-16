import {parseArgs} from 'node:util';
import 'readline';
import * as readline from "node:readline";
class LLM {
    constructor() {
        this.prompted = false;
    }

    prompt_running = async () => {
        while (this.prompted) {
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    chat = async (prompt, tokens) => {
        this.prompted = true;
        let response = await fetch("http://127.0.0.1:8080/completion", {
            method: 'POST',
            body: JSON.stringify({
                prompt,
                n_predict: tokens,
                stream: true,

            })
        })
        const reader = response.body.getReader()
        const decoder = new TextDecoder("utf-8", {ignoreBOM: true})
        let partialData = '';
        let parsedData = '';

        while (true) {
            const {done, value} = await reader.read();
            if (done) break;

            partialData = decoder.decode(value, {stream: true});
            let newData = partialData.substring(6);
            parsedData = JSON.parse(newData).content;
            process.stdout.write(parsedData);
        }
        this.prompted = false;
    }
}

async function main(){
    const llm = new LLM();
    const argOptions = {
        prompt: {type: 'string', short: 'p', default: ''},
        tokens: {type: 'string', short: 't', default: '200'},
        mode: {type: 'string', short: 'm', default: 'local'}
    }
    const args = parseArgs({options: argOptions})
    if (args.values.prompt !== ''){
        llm.chat(args.values.prompt, parseInt(args.values.tokens)).catch(err => console.log(err));
        await llm.prompt_running();
        process.exit(0);
    }

    let running = true;
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    })
    while (running) {
        rl.question("", (prompt) => {
            if (prompt === "stop") {
                running = false;
                llm.prompted = false;
                return;
            }
            llm.chat(prompt, args.values.tokens).catch(err => console.log(err));
        });
        llm.prompted = true;
        await llm.prompt_running();
    }
    process.exit(0);

}

main().catch(err => console.log(err));