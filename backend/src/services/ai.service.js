const { GoogleGenAI } = require('@google/genai');
const MODEL=process.env.GEMINI_MODEL||'gemini-3.6-flash';
const getClient=()=>process.env.GEMINI_API_KEY?new GoogleGenAI({apiKey:process.env.GEMINI_API_KEY}):null;

exports.chat=async(systemPrompt,messages)=>{
  const ai=getClient();
  if(!ai)throw new Error('AI service is not configured. Add GEMINI_API_KEY to backend/.env.');
  try{
    const contents=messages.map(message=>({role:message.role==='assistant'?'model':'user',parts:[{text:message.content}]}));
    const response=await ai.models.generateContent({model:MODEL,contents,config:{systemInstruction:systemPrompt,temperature:0.5,maxOutputTokens:4096}});
    const reply=response.text?.trim();
    if(!reply)throw new Error('Gemini returned an empty response');
    return {reply,tokens:null,finishReason:'stop'};
  }catch(error){console.error('Gemini API error:',error);throw new Error('AI service is currently unavailable');}
};

exports.analyzeDocument=async(mimeType,base64Data,instruction)=>{
  const ai=getClient();
  if(!ai)throw new Error('AI service is not configured. Add GEMINI_API_KEY to backend/.env.');
  try{
    const response=await ai.models.generateContent({model:MODEL,contents:[{role:'user',parts:[{inlineData:{mimeType,data:base64Data}},{text:instruction}]}],config:{temperature:0.3,maxOutputTokens:4096}});
    const reply=response.text?.trim();
    if(!reply)throw new Error('Gemini returned an empty document analysis');
    return {reply};
  }catch(error){console.error('Gemini document error:',error);throw new Error('Unable to analyze this document right now');}
};
