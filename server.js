// TestMint backend — keeps the Gemini API key on the server, never in the browser.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = __dirname;
const port = process.env.PORT || 3000;
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8'};
const schema = {
  type:'OBJECT',
  properties:{questions:{type:'ARRAY',items:{type:'OBJECT',properties:{q:{type:'STRING'},o:{type:'ARRAY',items:{type:'STRING'}},a:{type:'INTEGER'},explanation:{type:'STRING'},source:{type:'STRING'},page:{type:'INTEGER'},sourceQuestionNumber:{type:'INTEGER'},hasDiagram:{type:'BOOLEAN'},figureX:{type:'INTEGER'},figureY:{type:'INTEGER'},figureWidth:{type:'INTEGER'},figureHeight:{type:'INTEGER'}},required:['q','o','a','explanation','source','page','sourceQuestionNumber','hasDiagram','figureX','figureY','figureWidth','figureHeight']}}},
  required:['questions']
};

function corsHeaders(){return {'Access-Control-Allow-Origin':process.env.ALLOWED_ORIGIN||'*','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type'};}
function json(res,status,body){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8',...corsHeaders()});res.end(JSON.stringify(body));}
async function body(req){let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>30_000_000) throw new Error('PDF is too large. Please upload a PDF below 20 MB.')}return JSON.parse(raw);}
async function generate({text,pdfData,count,difficulty,sourceQuestionCount}){
  if(!process.env.GEMINI_API_KEY) throw new Error('Server is not configured. Add GEMINI_API_KEY to your environment and restart the server.');
  const instructions=`You build accurate practice tests from the supplied original PDF. Return only questions grounded in that PDF.
The PDF itself is the source of truth, including its visual layout, mathematical notation, subscripts, Greek letters, equations, diagrams, and answer options. The transcript may be incomplete: never replace a missing visual option with “Option A/B/C/D”, never invent generic text, and never silently omit values or symbols.
Priority 1: The PDF contains exactly ${sourceQuestionCount || 'the detected number of'} numbered source questions. Extract every one of them first, in source order. Preserve full wording and all four choices exactly, repairing only OCR spacing. Set sourceQuestionNumber to the real PDF number. For mathematical notation, write readable Unicode (never LaTex commands) such as B = μ₀I/(2πr), √3, x̂, μT.
Priority 2: If the PDF contains a diagram needed to solve a question, set hasDiagram=true and return the diagram's bounding rectangle on its one-based PDF page as figureX, figureY, figureWidth, figureHeight. These are integer percentages from 0 to 100 measured from the top-left of the page. Make the rectangle tight around only the relevant figure (do not include the whole page or other questions). If no diagram is required, set hasDiagram=false and all four figure values to 0.
Priority 3: Use an answer key if present. If absent, solve only from the PDF-supported physics/mathematics. Explain the correct choice in one concise sentence.
Return exactly ${Math.max(Number(count)||10,Number(sourceQuestionCount)||0)} questions. After all ${sourceQuestionCount || 'source'} original questions, create the remaining questions as fresh AI practice replicas based only on the same PDF concepts; set sourceQuestionNumber to 0, page to 0, hasDiagram=false and all figure values to 0 for replicas. Use exactly four meaningful options and exactly one correct answer. Never use filler like “All of the above”, “None of the above”, “Option A”, or arbitrary sentence fragments. Requested difficulty: ${difficulty}.`;
  const prompt=`${instructions}\n\nCreate the requested test from this PDF transcript:\n\n${text.slice(0,90000)}`;
  const parts=[{text:prompt}];
  if(pdfData) parts.push({inlineData:{mimeType:'application/pdf',data:pdfData}});
  const payload={contents:[{parts}],generationConfig:{responseMimeType:'application/json',responseSchema:schema,temperature:0.1}};
  const model=process.env.GEMINI_MODEL||'gemini-3.5-flash-lite';
  const api=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  const data=await api.json();
  if(!api.ok) throw new Error(data.error?.message||'Gemini API request failed.');
  const output=data.candidates?.[0]?.content?.parts?.map(part=>part.text||'').join('');
  if(!output) throw new Error('Gemini could not return a test for this PDF.');
  const parsed=JSON.parse(output);
  return parsed.questions;
}
http.createServer(async(req,res)=>{
  if(req.method==='OPTIONS'&&req.url==='/api/generate-test'){res.writeHead(204,corsHeaders());res.end();return;}
  if(req.method==='POST'&&req.url==='/api/generate-test'){
    try{const result=await generate(await body(req));json(res,200,{questions:result});}catch(error){json(res,400,{error:error.message});}return;
  }
  const requested=req.url==='/'?'/index.html':decodeURIComponent(req.url.split('?')[0]);
  const file=path.resolve(root,'.'+requested);
  if(!file.startsWith(root)||!fs.existsSync(file)||fs.statSync(file).isDirectory()){res.writeHead(404);res.end('Not found');return;}
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(res);
}).listen(port,()=>console.log(`TestMint running at http://localhost:${port}`));

