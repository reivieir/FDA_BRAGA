import { timingSafeEqual } from 'node:crypto';

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método não permitido.' });
  }
  const esperado = process.env.FDA_SENHA_ACESSO;
  if (!esperado) return res.status(503).json({ error: 'Acesso indisponível.' });
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); }
    catch { return res.status(400).json({ error: 'Dados inválidos.' }); }
  }
  const senha = body?.senha;
  if (typeof senha !== 'string' || senha.length > 128) {
    return res.status(400).json({ error: 'Dados inválidos.' });
  }
  const recebido = Buffer.from(senha);
  const correto = Buffer.from(esperado);
  if (recebido.length !== correto.length || !timingSafeEqual(recebido, correto)) {
    return res.status(401).json({ error: 'Senha incorreta.' });
  }
  return res.status(200).json({ autorizado: true });
}
