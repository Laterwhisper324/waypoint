const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const uploadDir = path.join(__dirname, 'user_icons');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, req.body.email.replace(/[^a-zA-Z0-9]/g, '_') + ext);
    }
});
const upload = multer({ storage });

const app = express();
const PORT = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// Rota para upload de imagem de usuário
app.post('/upload_icon', upload.single('icon'), (req, res) => {
    console.log('UPLOAD:', req.body, req.file); // <-- Adicione esta linha!
    if (!req.file || !req.body.email) {
        return res.status(400).send('Faltando arquivo ou email.');
    }
    const filePath = path.join(__dirname, 'cadastros-feitos');
    const email = req.body.email;
    const imgPath = `user_icons/${email.replace(/[^a-zA-Z0-9]/g, '_')}${path.extname(req.file.originalname)}`;

    // Atualiza a linha do usuário no arquivo de cadastros
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) return res.status(500).send('Erro ao atualizar cadastro.');
        const linhas = data.split('\n').map(linha => {
            if (linha.includes(`Email: ${email}`)) {
                // Atualiza ou adiciona o campo Imagem
                if (linha.includes('Imagem:')) {
                    return linha.replace(/Imagem: .*/, `Imagem: ${imgPath}`);
                } else {
                    return linha + ` | Imagem: ${imgPath}`;
                }
            }
            return linha;
        });
        fs.writeFile(filePath, linhas.join('\n'), err2 => {
            if (err2) return res.status(500).send('Erro ao atualizar cadastro.');
            res.send({ sucesso: true, filename: req.file.filename, imgPath });
        });
    });
});

// Rota para buscar imagem do usuário
app.get('/user_icon/:email', (req, res) => {
    const email = req.params.email;
    const filePath = path.join(__dirname, 'cadastros-feitos');
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err || !data) {
            return res.sendFile(path.join(__dirname, 'icone.png'));
        }
        const linhas = data.split('\n');
        for (const linha of linhas) {
            if (linha.includes(`Email: ${email}`)) {
                const imgMatch = linha.match(/Imagem:\s*([^\s|]+)/);
                if (imgMatch && fs.existsSync(path.join(__dirname, imgMatch[1]))) {
                    return res.sendFile(path.join(__dirname, imgMatch[1]));
                }
            }
        }
        res.sendFile(path.join(__dirname, 'icone.png'));
    });
});

// Rota para receber o cadastro
app.post('/cadastro', (req, res) => {
    const { nome, email, senha, confirmar } = req.body;
    const filePath = path.join(__dirname, 'cadastros-feitos');

    // Verifica se todos os campos estão preenchidos
    if (!nome || !email || !senha || !confirmar) {
        return res.status(400).send('Preencha todos os campos.');
    }

    // Verifica se o e-mail é válido (contém @)
    if (!email.includes('@')) {
        return res.status(400).send('E-mail inválido.');
    }

    // Verifica se as senhas são iguais
    if (senha !== confirmar) {
        return res.status(400).send('As senhas não coincidem.');
    }

    // Verifica se a senha é fraca (exemplo: menos de 6 caracteres)
    if (senha.length < 6) {
        return res.status(400).send('Senha fraca. Use pelo menos 6 caracteres.');
    }

    // Caminho padrão da imagem (pode ser atualizado depois do upload)
    const imgPath = `user_icons/${email.replace(/[^a-zA-Z0-9]/g, '_')}.png`;

    // Lê o arquivo de cadastros para verificar e-mail e senha repetidos
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (!err && data) {
            const linhas = data.split('\n');
            for (const linha of linhas) {
                if (linha.includes(`Email: ${email} `)) {
                    return res.status(400).send('E-mail já usado.');
                }
                if (linha.includes(`Senha: ${senha}`)) {
                    return res.status(400).send('Senha fraca ou já utilizada. Escolha outra senha.');
                }
            }
        }

        // Agora salva o caminho da imagem junto
        const linha = `Nome: ${nome} | Email: ${email} | Senha: ${senha} | Imagem: ${imgPath}\n`;
        fs.appendFile(filePath, linha, (err) => {
            if (err) {
                return res.status(500).send('Erro ao salvar cadastro.');
            }
            res.send('<h2>Cadastro realizado com sucesso!</h2><a href="cadastro.html">Voltar</a>');
        });
    });
});

// Rota para login
app.post('/login', (req, res) => {
    const { email, senha } = req.body;
    const filePath = path.join(__dirname, 'cadastros-feitos');

    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err || !data) {
            return res.status(500).send({ sucesso: false, mensagem: 'Erro ao acessar cadastros.' });
        }
        const linhas = data.split('\n');
        for (const linha of linhas) {
            // Extrai os campos da linha (senha só até o próximo | ou fim da linha)
            const match = linha.match(/Nome:\s*(.*?)\s*\|\s*Email:\s*(.*?)\s*\|\s*Senha:\s*([^\|]*)/);
            if (match) {
                const nome = match[1].trim();
                const emailArq = match[2].trim();
                const senhaArq = match[3].trim();
                if (emailArq === email && senhaArq === senha) {
                    return res.send({ sucesso: true, nome });
                }
            }
        }
        res.send({ sucesso: false, mensagem: 'E-mail ou senha incorretos.' });
    });
});

// Inicia o servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});