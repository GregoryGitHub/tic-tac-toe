import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import { TicTacToeGame, Player, CellValue, Board } from './game';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // Altere para a porta do seu frontend, se diferente
    methods: ["GET", "POST"]
  }
});

app.use(cors());

app.get('/', (req, res) => {
  res.send('Servidor do Jogo da Velha funcionando!');
});

interface Room {
  id: string;
  name: string; // Adicionado nome da sala
  players: Player[];
  game: TicTacToeGame;
}

const rooms: Map<string, Room> = new Map();
const playerRooms: Map<string, string> = new Map(); // playerId -> roomId

io.on('connection', (socket: Socket) => {
  console.log('Um usuário conectado:', socket.id);

  // Novo evento para listar salas disponíveis
  socket.on('listRooms', () => {
    const availableRooms = Array.from(rooms.values()).filter(
      room => room.players.length < 2
    ).map(room => ({ id: room.id, name: room.name, playersCount: room.players.length }));
    socket.emit('roomsList', availableRooms);
  });

  // Novo evento para criar uma sala com nome personalizado
  socket.on('createRoom', (roomName: string, playerName: string) => {
    const roomId = `room-${Math.random().toString(36).substring(7)}`;
    const newGame = new TicTacToeGame();
    const roomToJoin: Room = { id: roomId, name: roomName, players: [], game: newGame };
    rooms.set(roomId, roomToJoin);

    const newPlayer = roomToJoin.game.addPlayer(socket.id, playerName);
    if (newPlayer) {
      roomToJoin.players.push(newPlayer);
      playerRooms.set(socket.id, roomToJoin.id);
      socket.join(roomToJoin.id);

      socket.emit('playerAssigned', newPlayer);
      socket.emit('roomCreated', roomToJoin.id, roomToJoin.name); // Envia o ID e nome da sala criada
      socket.emit('message', `Sala "${roomName}" criada. Aguardando outro jogador...`);
      io.emit('roomsListUpdated'); // Notifica todos para atualizarem a lista de salas
    } else {
      socket.emit('error', 'Não foi possível criar a sala. Tente novamente.');
    }
  });

  socket.on('joinGame', (playerName: string, roomId?: string) => {
    let roomToJoin: Room | undefined;

    if (roomId) {
      // Tenta entrar em uma sala específica
      roomToJoin = rooms.get(roomId);
      if (!roomToJoin) {
        socket.emit('error', 'Sala não encontrada.');
        return;
      }
      if (roomToJoin.players.length >= 2) {
        socket.emit('error', 'A sala está cheia.');
        return;
      }
    } else {
      // Tenta encontrar uma sala existente com menos de 2 jogadores
      for (const room of Array.from(rooms.values())) {
        if (room.players.length < 2) {
          roomToJoin = room;
          break;
        }
      }

      if (!roomToJoin) {
        // Se não houver sala disponível, cria uma nova com um nome padrão
        const roomId = `room-${Math.random().toString(36).substring(7)}`;
        const newGame = new TicTacToeGame();
        roomToJoin = { id: roomId, name: "Sala Padrão", players: [], game: newGame }; // Adicionado nome padrão
        rooms.set(roomId, roomToJoin);
      }
    }

    if (roomToJoin) {
      const newPlayer = roomToJoin.game.addPlayer(socket.id, playerName);
      if (newPlayer) {
        roomToJoin.players.push(newPlayer);
        playerRooms.set(socket.id, roomToJoin.id);
        socket.join(roomToJoin.id);

        socket.emit('playerAssigned', newPlayer);
        // io.to(roomToJoin.id).emit('gameUpdate', { board: roomToJoin.game.getBoard(), players: roomToJoin.game.getPlayers(), currentPlayer: roomToJoin.game.getCurrentPlayer(), winner: roomToJoin.game.getWinner(), gameEnded: roomToJoin.game.isGameEnded() });

        console.log(`Jogador ${playerName} (${socket.id}) juntou-se à sala ${roomToJoin.id}. Jogadores na sala: ${roomToJoin.players.length}`);

        if (roomToJoin.players.length === 2) {
          io.to(roomToJoin.id).emit('startGame', roomToJoin.players);
          io.to(roomToJoin.id).emit('gameUpdate', { board: roomToJoin.game.getBoard(), players: roomToJoin.game.getPlayers(), currentPlayer: roomToJoin.game.getCurrentPlayer(), winner: roomToJoin.game.getWinner(), gameEnded: roomToJoin.game.isGameEnded() });
        } else {
          socket.emit('message', 'Aguardando outro jogador...');
        }
      } else {
        socket.emit('error', 'Não foi possível entrar na sala. A sala está cheia.');
      }
    }
  });

  // Novo evento para um jogador reiniciar o jogo na sala atual
  socket.on('resetGameInRoom', () => {
    const roomId = playerRooms.get(socket.id);
    if (!roomId) {
      socket.emit('error', 'Você não está em nenhuma sala para reiniciar o jogo.');
      return;
    }

    const room = rooms.get(roomId);
    if (room) {
      room.game.resetGame();
      // O addPlayer já é chamado no joinGame, então os jogadores devem ser adicionados novamente se a sala estiver vazia
      // Se a sala não estiver vazia (jogadores ainda lá), só resetar o tabuleiro.
      
      // Se a sala tinha 2 jogadores e um deles saiu, o resetGame do disconnect já lidou com os jogadores.
      // Se a partida terminou e os 2 jogadores ainda estão na sala e querem jogar de novo:
      // O resetGame() em game.ts agora limpa this.players, então precisamos re-adicionar.
      // No entanto, como o resetGame é para *iniciar um novo jogo* na mesma sala, os jogadores *continuam* lá
      // e o problema é que o resetGame do game.ts limpa this.players. Isso precisa ser ajustado.
      // A lógica de resetGame() deve resetar o tabuleiro, mas manter os jogadores existentes.
      // Vamos reverter a mudança em game.ts para resetGame não limpar players.

      io.to(room.id).emit('gameUpdate', { board: room.game.getBoard(), players: room.game.getPlayers(), currentPlayer: room.game.getCurrentPlayer(), winner: room.game.getWinner(), gameEnded: room.game.isGameEnded() });
      io.to(room.id).emit('message', 'O jogo foi reiniciado. Próxima rodada!');
      io.to(room.id).emit('gameReset'); // Adicionado: Notifica o frontend sobre o reset do jogo
      console.log(`Jogo na sala ${roomId} foi reiniciado.`);
    } else {
      socket.emit('error', 'Sala não encontrada para reiniciar o jogo.');
    }
  });

  socket.on('makeMove', (row: number, col: number) => {
    const roomId = playerRooms.get(socket.id);
    if (!roomId) {
      socket.emit('error', 'Você não está em nenhuma sala.');
      return;
    }

    const room = rooms.get(roomId);
    if (!room) {
      socket.emit('error', 'Sala não encontrada.');
      return;
    }

    const success = room.game.makeMove(socket.id, row, col);
    if (success) {
      io.to(room.id).emit('gameUpdate', { board: room.game.getBoard(), players: room.game.getPlayers(), currentPlayer: room.game.getCurrentPlayer(), winner: room.game.getWinner(), gameEnded: room.game.isGameEnded() });
      if (room.game.isGameEnded()) {
        io.to(room.id).emit('gameEnd', { winner: room.game.getWinner(), board: room.game.getBoard() });
      }
    } else {
      socket.emit('error', 'Movimento inválido ou não é seu turno.');
    }
  });

  // Novo evento para um jogador sair de uma sala explicitamente
  socket.on('leaveRoom', () => {
    const roomId = playerRooms.get(socket.id);
    if (roomId) {
      const room = rooms.get(roomId);
      if (room) {
        room.players = room.players.filter(p => p.id !== socket.id);
        playerRooms.delete(socket.id);
        socket.leave(roomId);

        console.log(`Jogador ${socket.id} saiu da sala ${roomId}. Jogadores restantes: ${room.players.length}`);

        if (room.players.length === 0) {
          // Se a sala ficar vazia, resetar o jogo, mas NÃO destruir a sala
          room.game.resetGame();
          io.to(room.id).emit('message', 'A sala foi resetada. Aguardando jogadores...');
          io.emit('roomsListUpdated'); // Notificar todos para atualizar a lista de salas
          console.log(`Sala ${roomId} resetada (ficou vazia).`);
        } else {
          // Notificar o jogador restante que o outro jogador saiu
          io.to(room.id).emit('playerLeft', `O jogador ${socket.id} saiu da sala.`);
          room.game.resetGame(); // Resetar o jogo para que um novo jogador possa entrar
          io.to(room.id).emit('gameUpdate', { board: room.game.getBoard(), players: room.game.getPlayers(), currentPlayer: room.game.getCurrentPlayer(), winner: room.game.getWinner(), gameEnded: room.game.isGameEnded() });
          io.to(room.id).emit('error', 'Seu oponente se desconectou. O jogo foi resetado. Aguardando um novo jogador...');
          io.emit('roomsListUpdated'); // Notificar todos para atualizar a lista de salas
        }
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('Usuário desconectado:', socket.id);
    const roomId = playerRooms.get(socket.id);

    if (roomId) {
      const room = rooms.get(roomId);
      if (room) {
        room.players = room.players.filter(p => p.id !== socket.id);
        // Não remover a sala aqui, apenas o jogador
        playerRooms.delete(socket.id);
        socket.leave(roomId);

        console.log(`Jogador ${socket.id} desconectado da sala ${roomId}. Jogadores restantes: ${room.players.length}`);

        if (room.players.length === 0) {
          // Se a sala ficar vazia, resetar o jogo, mas NÃO destruir a sala
          room.game.resetGame();
          io.to(room.id).emit('message', 'A sala foi resetada. Aguardando jogadores...');
          io.emit('roomsListUpdated'); // Notificar todos para atualizar a lista de salas
          console.log(`Sala ${roomId} resetada (ficou vazia devido à desconexão).`);
        } else {
          // Notificar o jogador restante que o outro jogador saiu
          io.to(room.id).emit('playerLeft', `O jogador ${socket.id} desconectou. O jogo foi resetado.`);
          room.game.resetGame(); // Resetar o jogo para que um novo jogador possa entrar
          io.to(room.id).emit('gameUpdate', { board: room.game.getBoard(), players: room.game.getPlayers(), currentPlayer: room.game.getCurrentPlayer(), winner: room.game.getWinner(), gameEnded: room.game.isGameEnded() });
          io.to(room.id).emit('error', 'Seu oponente se desconectou. O jogo foi resetado. Aguardando um novo jogador...');
          io.emit('roomsListUpdated'); // Notificar todos para atualizar a lista de salas
        }
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
