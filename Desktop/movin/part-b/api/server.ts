import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';

type Photo = { id: string; filename: string; contentType: string; sizeBytes: number; roomType: string; status: 'awaiting_upload'|'uploaded'; createdAt: string; uploadUrl: string };
const photos = new Map<string, Photo>();
const json = (res: ServerResponse, status: number, body: unknown) => { res.writeHead(status, {'content-type':'application/json'}); res.end(JSON.stringify(body)); };
const body = async (req: IncomingMessage) => { let data=''; for await (const chunk of req) data += chunk; try{return JSON.parse(data || '{}')}catch{return null} };
const valid = (x: any) => x && typeof x.filename==='string' && x.filename.length>0 && typeof x.contentType==='string' && typeof x.sizeBytes==='number' && x.sizeBytes>0 && x.sizeBytes<=50_000_000 && typeof x.roomType==='string' && x.roomType.length>0;
const server = createServer(async (req,res) => {
  const url = new URL(req.url || '/', 'http://localhost');
  if (req.method==='GET' && url.pathname==='/api/photos') return json(res,200,{photos:[...photos.values()]});
  if (req.method==='POST' && url.pathname==='/api/photos') { const input=await body(req); if(!valid(input)) return json(res,400,{error:'filename, contentType, sizeBytes and roomType are required'}); const id=randomUUID(); const photo:Photo={id,filename:input.filename,contentType:input.contentType,sizeBytes:input.sizeBytes,roomType:input.roomType,status:'awaiting_upload',createdAt:new Date().toISOString(),uploadUrl:`http://localhost:3001/local-upload/${id}`}; photos.set(id,photo); return json(res,201,photo); }
  const match=url.pathname.match(/^\/api\/photos\/([^/]+)\/confirm$/); if(req.method==='POST' && match){const photo=photos.get(match[1]); if(!photo)return json(res,404,{error:'Photo not found'}); if(photo.status==='awaiting_upload')photo.status='uploaded'; return json(res,200,photo);}
  return json(res,404,{error:'Not found'});
});
server.listen(Number(process.env.PORT||3001),()=>console.log('MOVIN API listening on http://localhost:3001'));
