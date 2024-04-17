// get the open api key
import { dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const PropertiesReader = require('properties-reader');
const properties = PropertiesReader(__dirname + '/application.properties.ini');

import { OpenAI } from "openai"


export default class ChatService {
    context = ''; // the concatenation of all video texts; need to include it in every request
    openai; // communication handle
    // description of the task
    setupMsg = `
    1. I'm building an application where users can upload a set of texts and retrieve information from uploaded texts 
    by asking the application questions. 
    2. The set of texts are delimited by '---' with the following format:
       text description 1 ---
       text description 2 ---
       ...
       text description 3 ---
    3. After giving you the set of text, I will ask a question. You need to return a short and succinct answer based on the texts
    uploaded. Ideally your returned answer should be in just 1 sentence and no more than 2.`

    constructor() {
        let apiKey = properties.get('CHATGPT_API_KEY')
        if (!apiKey) {
            console.log("Cannot connect to OpenAI. Did you forget to add CHATGPT_API_KEY in application.properties.ini?")
        } else {
            this.openai = new OpenAI({
                apiKey: properties.get('CHATGPT_API_KEY')
            });
            console.log("Connected to OpenAI")
        }
    }

    async query(question, callback) {
        let messages = [{role: "system", content: this.setupMsg},
                        {role: "user", content: this.context},
                        {role: "user", content: question}]
        this.openai.chat.completions.create({
            model: "gpt-3.5-turbo-0125",
            messages: messages,
        }).then(res => {
            callback(null, res.choices[0].message.content)
        })
    }

    // After a video is uploaded, we need to add the text extracted to the context
    addToContext(text) {
        // texts are delimited by '--- '
        this.context += text + '---\n'
    }
}

// const question2 = `What is Thomas's big plan for the summer?`
// // const question3 = `What is matthew's passion?`
// // const question4 = `Who is logan fisher`
// let chat = new ChatService()
// chat.addToContext(`hello i''m matthew in siena.and a filipino american born and raised in l a.i studied graphic design at heart center in pasadena and i''ve been a creative professional for over fifteen years directing designing.in animating for some pretty awesome clients.over the past few years have discovered my passion for teaching others so i love to share what i''ve learned an expert variance in the form of videos words.in as a speaker onstage.i''m a kid who never really grew up i love to dance rock climb and spend time with my dog cherry.i waste way too much time playing video games i spent all my money on camera gear and tech.and i cannot function without a good cup of coffee in the morning.that''s me in a nutshell.feel for you to reach out and introduce yourself.i love making new friends. ---
// is this a future billionaire.at fifteen thomas creates and sells apps for smartphones and google glass.that''s what he''s wearing by the way a recording to.and that''s how he''s filming us with his glasses.and thomas has big plans for a summer he wants to revolutionize three d printer the technology recently i applied for patents on three d printing trying to make a three d printing faster.and more reliable and but that the key there is speed and.we''re trying to print ten times faster than current generation three d printers.thomas is self taught when it comes to business encoding.this school is trying to create entrepreneurs starting from age eleven for advertising we had to advertise i use social media as a device.and then we have appeared this is my profit sharing plan ready to make your decision at the incubator school kids are encouraged to start companies on school time.hi my name is armin israel and ceo of i supply.hi my name is logan fisher i am the see fo and the director of marketing and i supply.how my name is tailored treatment it on the head of sales.i supply these twelve year old captains of industry plan to sell school supplies to their classmates.they say kid have a big advantage when it comes to creating the next big thing kids personally a more creative cause you they haven''t been.boxed in by the world yet and you really haven''t you know you''re going to do this you''re going to do that you''re going to do this kid you to starve that mine where for example i''m going to be supermen when i had does should come up with the idea i never liked mandate and i didn''t want people to see that i have something cause look at the board.there''s this pint sized ceo is the youngest ever to dive into reality t v shark tank.at seven she considers herself a lifelong inventor and i feel like being a non trip per nur.you don''t have to follow somebody else''s orders.you can just be more free.the girl.that please with juicy russell kaja was dream is to become a zoologist while making boo boo brands into a household name.kids are still kid even if they are entrepreneurs sage advice for a new generation of business leaders reagan morris bbc news los angeles.`)
// chat.query(question2, (e, v) => {console.log(e, v)})