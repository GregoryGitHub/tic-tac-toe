import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import styled, { keyframes } from 'styled-components';

interface Player {
  id: string;
  name: string;
  symbol: 'X' | 'O';
}

type CellValue = 'X' | 'O' | null;
type Board = CellValue[][];

interface GameState {
  board: Board;
  players: Player[];
  currentPlayer: Player | null;
  winner: Player | null;
  gameEnded: boolean;
}

interface RoomInfo {
  id: string;
  name: string;
  playersCount: number;
}

const socket: Socket = io("http://192.168.10.97:3000"); // Conecta ao backend na porta 3000

// Keyframes para as animações
const gradientShift = keyframes`
  0% { background-position-y: 0%; }
  100% { background-position-y: 200%; } /* Animação de cima para baixo contínua */
`;

const gridMovement = keyframes`
  0% { background-position: 0 0; }
  100% { background-position: 0 40px; } /* Animação de cima para baixo */
`;

// Styled Components
const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background-color: #2a0a4a; /* Fundo roxo sólido e escuro */
  color: #ffffff;
  padding: 1rem;
  overflow: hidden;
  font-family: 'Cabin', sans-serif;

  background-image:
    linear-gradient(0deg, rgba(169, 88, 245, 0.1) 2px, transparent 2px),
    linear-gradient(90deg, rgba(169, 88, 245, 0.1) 2px, transparent 2px);
  background-size:
    40px 40px, /* Tamanho das linhas da grade */
    40px 40px; /* Tamanho das linhas da grade */

  animation:
    ${gridMovement} 1s linear infinite; /* Apenas animação da grade */
`;

const Title = styled.h1`
  font-size: 3.5rem;
  font-weight: 800;
  margin-bottom: 2rem;
  text-align: center;
  font-family: 'Cabin', sans-serif;

  background: linear-gradient(to right, #8e2de2, #ff9966); /* Roxo para Laranja */
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  color: transparent; /* Fallback para navegadores mais antigos */
`;

const ScoreDisplay = styled.div`
  display: flex;
  justify-content: space-around;
  width: 100%;
  max-width: 20rem;
  margin-bottom: 1.5rem;
  font-size: 1.5rem;
  font-weight: 700; /* Aumentar o peso da fonte para mais contraste */
  color: #e0e0e0; /* Cor mais clara para contraste */
  font-family: 'Cabin', sans-serif;

  span {
    padding: 0.5rem 1rem;
    background-color: #3b0066; /* Fundo mais escuro para o placar */
    border-radius: 0.5rem;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2); /* Sombra para profundidade */
  }
`;

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  space-y: 1rem;
`;

const Input = styled.input`
  padding: 0.75rem;
  border-radius: 0.5rem;
  background-color: #3b0066; /* Fundo mais escuro */
  color: #ffffff;
  border: 1px solid #6a00a8; /* Borda mais visível */
  font-size: 1.25rem;
  outline: none;
  font-family: 'Cabin', sans-serif;

  &:focus {
    box-shadow: 0 0 0 3px rgba(138, 43, 226, 0.5); /* Sombra roxa ao focar */
  }
`;

const StyledButton = styled.button<{ primary?: boolean }>`
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  color: #ffffff;
  font-weight: 700; /* Aumentar o peso da fonte */
  font-size: 1.25rem;
  transition: background-color 0.3s ease, box-shadow 0.3s ease;
  border: none;
  cursor: pointer;
  font-family: 'Cabin', sans-serif;

  ${(props) =>
    props.primary
      ? `background-color: #8e2de2; &:hover { background-color: #6a00a8; box-shadow: 0 6px 12px rgba(0, 0, 0, 0.3); }`
      : `background-color: #ff9966; &:hover { background-color: #e07b4e; box-shadow: 0 6px 12px rgba(0, 0, 0, 0.3); }`}
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
`;

const GameInfo = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  space-y: 1.5rem;
`;

const Message = styled.p`
  font-size: 1.5rem;
  font-weight: 700; /* Aumentar o peso da fonte */
  text-align: center;
  font-family: 'Cabin', sans-serif;

  background: linear-gradient(to right, #ff9966, #8e2de2); /* Laranja para Roxo */
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  color: transparent; /* Fallback para navegadores mais antigos */
`;

const PlayerInfo = styled.p`
  font-size: 1.25rem;
  text-align: center;
  color: #cccccc; /* Cor mais clara para contraste */
  font-family: 'Cabin', sans-serif;
`;

const BoardContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  background-color: #3b0066; /* Fundo mais escuro para o tabuleiro */
  padding: 1rem;
  border-radius: 0.5rem;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.4); /* Sombra mais intensa */
`;

const CellButton = styled.button<{disabled: boolean}>`
  width: 5rem;
  height: 5rem;
  font-size: 2.5rem;
  font-weight: 700;
  border: 1px solid #6a00a8;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #550080; /* Cor de célula mais escura */
  color: #ffffff;
  cursor: ${(props) => (props.disabled ? 'not-allowed' : 'pointer')};
  opacity: ${(props) => (props.disabled ? 0.6 : 1)}; /* Opacidade ajustada */
  transition: background-color 0.3s ease, transform 0.1s ease;
  font-family: 'Cabin', sans-serif;

  &:hover {
    ${(props) => (props.disabled ? '' : 'background-color: #4b006e; transform: scale(1.05);')}
  }
`;

const RoomList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
  max-width: 20rem;
  margin-top: 1rem;
`;

const RoomItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background-color: #4b006e;
  border-radius: 0.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  font-size: 1.1rem;
  font-weight: 600;
  color: #ffffff;
  font-family: 'Cabin', sans-serif;

  span {
    flex-grow: 1;
  }

  button {
    padding: 0.4rem 0.8rem;
    font-size: 0.9rem;
    background-color: #8e2de2;
    color: #ffffff;
    border: none;
    border-radius: 0.3rem;
    cursor: pointer;
    transition: background-color 0.3s ease;

    &:hover {
      background-color: #6a00a8;
    }
    &:disabled {
      background-color: #cccccc;
      cursor: not-allowed;
    }
  }
`;

function App() {
  const [playerName, setPlayerName] = useState<string>('');
  const [roomNameInput, setRoomNameInput] = useState<string>(''); // Novo estado para o nome da sala
  const [player, setPlayer] = useState<Player | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [message, setMessage] = useState<string>('');
  const [joined, setJoined] = useState<boolean>(false);
  const [playerXWins, setPlayerXWins] = useState<number>(0);
  const [playerOWins, setPlayerOWins] = useState<number>(0);
  const [rooms, setRooms] = useState<RoomInfo[]>([]); // Novo estado para a lista de salas
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null); // ID da sala atual
  const [backgroundVolume, setBackgroundVolume] = useState<number>(0.3); // Volume inicial da música de fundo (0 a 1)
  const [sfxVolume, setSfxVolume] = useState<number>(0.7); // Volume inicial dos efeitos sonoros (0 a 1)

  const audioRef = useRef<HTMLAudioElement>(null); // Ref para o elemento de áudio
  const xMoveSoundRef = useRef<HTMLAudioElement>(null); // Ref para o som da jogada X
  const oMoveSoundRef = useRef<HTMLAudioElement>(null); // Ref para o som da jogada O

  useEffect(() => {
    // Define o volume inicial quando os refs estão disponíveis
    if (audioRef.current) {
      audioRef.current.volume = backgroundVolume;
    }
    if (xMoveSoundRef.current) {
      xMoveSoundRef.current.volume = sfxVolume;
    }
    if (oMoveSoundRef.current) {
      oMoveSoundRef.current.volume = sfxVolume;
    }

    socket.on('playerAssigned', (assignedPlayer: Player) => {
      setPlayer(assignedPlayer);
      setMessage(`Você é o jogador ${assignedPlayer.symbol}`);
      setJoined(true); // Atualiza o estado 'joined' quando o jogador é atribuído
      // O jogo pode começar aqui ou após o segundo jogador entrar, então a música pode tocar
      audioRef.current?.play(); // Toca a música quando o jogador é atribuído a uma sala
    });

    socket.on('gameUpdate', (state: GameState) => {
      setGameState(state);
      if (state.winner) {
        setMessage(`${state.winner.name} (${state.winner.symbol}) venceu!`);
        if (state.winner.symbol === 'X') {
          setPlayerXWins(prev => prev + 1);
        } else {
          setPlayerOWins(prev => prev + 1);
        }
      } else if (state.gameEnded && !state.winner) {
        setMessage('O jogo empatou!');
      } else if (state.currentPlayer && player && state.currentPlayer.id === player.id) {
        setMessage('Sua vez de jogar!');
      } else if (state.currentPlayer && player && state.currentPlayer.id !== player.id) {
        setMessage(`Vez de ${state.currentPlayer.name} (${state.currentPlayer.symbol})`);
      }
    });

    socket.on('startGame', (players: Player[]) => {
      setMessage(`Jogo começou! Jogadores: ${players[0].name} (X) vs ${players[1].name} (O)`);
      audioRef.current?.play(); // Garante que a música toque quando o jogo de fato começa
    });

    socket.on('gameEnd', (data: { winner: Player | null; board: Board }) => {
      if (data.winner) {
        setMessage(`${data.winner.name} (${data.winner.symbol}) venceu!`);
        if (data.winner.symbol === 'X') {
          setPlayerXWins(prev => prev + 1);
        } else {
          setPlayerOWins(prev => prev + 1);
        }
      } else {
        setMessage('O jogo empatou!');
      }
    });

    socket.on('message', (msg: string) => {
      setMessage(msg);
    });

    socket.on('playerLeft', (msg: string) => {
      setMessage(msg);
      setGameState(null);
      setPlayer(null);
      setJoined(false);
      setPlayerName('');
      setCurrentRoomId(null); // Resetar o ID da sala
      socket.emit('listRooms'); // Atualizar lista de salas
      audioRef.current?.pause(); // Pausa a música quando o jogador sai da sala
      if (audioRef.current) audioRef.current.currentTime = 0; // Volta a música para o início
    });

    socket.on('error', (errorMessage: string) => {
      setMessage(`Erro: ${errorMessage}`);
    });

    // Novos listeners para salas
    socket.on('roomsList', (availableRooms: RoomInfo[]) => {
      setRooms(availableRooms);
    });

    socket.on('roomsListUpdated', () => {
      socket.emit('listRooms'); // Solicitar lista atualizada de salas
    });

    socket.on('roomCreated', (roomId: string, roomName: string) => {
      setMessage(`Sala "${roomName}" criada com sucesso! ID: ${roomId}. Aguardando outro jogador...`);
      setCurrentRoomId(roomId);
      setJoined(true); // AGORA ESTÁ CORRETO: Define 'joined' para o criador da sala
      audioRef.current?.play(); // Toca a música quando a sala é criada
    });

    // Listener para o novo evento de reset de jogo na mesma sala
    socket.on('gameReset', () => {
      setMessage('O jogo foi reiniciado. Próxima rodada!');
      if (audioRef.current) {
        audioRef.current.currentTime = 0; // Reinicia a música
        audioRef.current.play();
      }
    });

    // Solicitar lista de salas ao montar o componente
    socket.emit('listRooms');

    return () => {
      socket.off('playerAssigned');
      socket.off('gameUpdate');
      socket.off('startGame');
      socket.off('gameEnd');
      socket.off('playerLeft');
      socket.off('error');
      socket.off('message');
      socket.off('roomsList'); // Desliga o listener
      socket.off('roomsListUpdated'); // Desliga o listener
      socket.off('roomCreated'); // Desliga o listener
      socket.off('gameReset'); // Desliga o listener
    };
  }, [player, playerXWins, playerOWins]);

  // Efeito para atualizar o volume da música de fundo
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = backgroundVolume;
    }
  }, [backgroundVolume]);

  // Efeito para atualizar o volume dos efeitos sonoros
  useEffect(() => {
    if (xMoveSoundRef.current) {
      xMoveSoundRef.current.volume = sfxVolume;
    }
    if (oMoveSoundRef.current) {
      oMoveSoundRef.current.volume = sfxVolume;
    }
  }, [sfxVolume]);

  const handleJoinGame = (roomId?: string) => {
    if (playerName.trim()) {
      socket.emit('joinGame', playerName, roomId);
      // setJoined(true); // Remover: será definido quando o playerAssigned for recebido
    } else {
      setMessage('Por favor, digite seu nome de jogador para entrar na sala.');
    }
  };

  const handleCreateRoom = () => {
    if (roomNameInput.trim() && playerName.trim()) {
      socket.emit('createRoom', roomNameInput, playerName);
      // setJoined(true); // Remover: será definido quando o roomCreated for recebido
    } else {
      setMessage('Por favor, digite seu nome e o nome da sala.');
    }
  };

  const handleMakeMove = (row: number, col: number) => {
    if (player && gameState && gameState.currentPlayer && gameState.currentPlayer.id === player.id && !gameState.gameEnded && gameState.board[row][col] === null) {
      socket.emit('makeMove', row, col);
      // Tocar o som da jogada
      if (player.symbol === 'X') {
        if (xMoveSoundRef.current) {
          xMoveSoundRef.current.currentTime = 0; // Reinicia o som
          xMoveSoundRef.current.play();
        }
      } else if (player.symbol === 'O') {
        if (oMoveSoundRef.current) {
          oMoveSoundRef.current.currentTime = 0; // Reinicia o som
          oMoveSoundRef.current.play();
        }
      }
    } else if (gameState?.gameEnded) {
      setMessage('O jogo já terminou!');
    } else if (gameState?.board[row][col] !== null) {
      setMessage('Esta célula já está preenchida!');
    } else if (player && gameState && gameState.currentPlayer && gameState.currentPlayer.id !== player.id) {
      setMessage('Não é a sua vez!');
    } else {
      setMessage('Por favor, junte-se a um jogo primeiro.');
    }
  };

  const renderCell = (value: CellValue, row: number, col: number) => (
    <CellButton
      key={`${row}-${col}`}
      onClick={() => handleMakeMove(row, col)}
      disabled={!joined || !player || !gameState || gameState.gameEnded || value !== null || (gameState.currentPlayer && gameState.currentPlayer.id !== player.id)}
    >
      {value}
    </CellButton>
  );

  const handleResetGameInRoom = () => {
    socket.emit('resetGameInRoom');
  };

  const handleLeaveRoom = () => {
    socket.emit('leaveRoom');
    setGameState(null);
    setPlayer(null);
    setJoined(false);
    setPlayerName('');
    setCurrentRoomId(null);
    setMessage('Você saiu da sala.');
  };

  return (
    <Container>
      <Title>Jogo da Velha Online</Title>
      <ScoreDisplay>
        <span>Vitórias X: {playerXWins}</span>
        <span>Vitórias O: {playerOWins}</span>
      </ScoreDisplay>

      {!joined ? (
        <InputGroup>
          <Message>{message}</Message>
          <Input
            type="text"
            placeholder="Seu nome de jogador"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
          />
          <Input
            type="text"
            placeholder="Nome da nova sala (opcional)"
            value={roomNameInput}
            onChange={(e) => setRoomNameInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleCreateRoom()}
          />
          <StyledButton primary onClick={handleCreateRoom} style={{ marginBottom: '1rem' }}>
            Criar Sala
          </StyledButton>
          {rooms.length > 0 && (
            <>
              <Message>Salas Disponíveis:</Message>
              <RoomList>
                {rooms.map(room => (
                  <RoomItem key={room.id}>
                    <span>{room.name} ({room.playersCount}/2)</span>
                    <StyledButton onClick={() => handleJoinGame(room.id)} disabled={room.playersCount === 2}>
                      Entrar
                    </StyledButton>
                  </RoomItem>
                ))}
              </RoomList>
            </>
          )}
          {rooms.length === 0 && (
            <Message>Nenhuma sala aberta. Crie uma!</Message>
          )}
          {/* Botão para entrar em qualquer sala disponível (comportamento antigo) */}
          <StyledButton onClick={() => handleJoinGame()} style={{ marginTop: '1rem' }}>
            Entrar em Qualquer Sala
          </StyledButton>
        </InputGroup>
      ) : (
        <GameInfo>
          <Message>{message}</Message>

          {player && <PlayerInfo>Você é: {player.name} ({player.symbol})</PlayerInfo>}

          {gameState && gameState.players.length === 2 && (
            <PlayerInfo>Oponente: {gameState.players.find(p => p.id !== player?.id)?.name} ({gameState.players.find(p => p.id !== player?.id)?.symbol})</PlayerInfo>
          )}

          {gameState?.board && (
            <BoardContainer>
              {gameState.board.map((row, rowIndex) => (
                row.map((cell, colIndex) => renderCell(cell, rowIndex, colIndex))
              ))}
            </BoardContainer>
          )}

          {gameState?.gameEnded && (
            <StyledButton
              onClick={handleResetGameInRoom} // Modificado para reiniciar o jogo na mesma sala
            >
              Nova Partida
            </StyledButton>
          )}
          {player && joined && (
            <StyledButton onClick={handleLeaveRoom} style={{ marginTop: '1rem' }}>
              Sair do Jogo
            </StyledButton>
          )}
        </GameInfo>
      )}

      <audio ref={audioRef} src="/You Know Me - Jeremy Black.mp3" loop autoPlay preload="auto" />
      <audio ref={xMoveSoundRef} src="/x_move.mp3" preload="auto" /> {/* Assumindo nome do arquivo */}
      <audio ref={oMoveSoundRef} src="/o_move.mp3" preload="auto" /> {/* Assumindo nome do arquivo */}

      <VolumeControlGroup>
        <VolumeControl>
          <span>Música:</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={backgroundVolume}
            onChange={(e) => setBackgroundVolume(parseFloat(e.target.value))}
          />
        </VolumeControl>
        <VolumeControl>
          <span>Efeitos:</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={sfxVolume}
            onChange={(e) => setSfxVolume(parseFloat(e.target.value))}
          />
        </VolumeControl>
      </VolumeControlGroup>
    </Container>
  );
}

const VolumeControlGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 2rem;
  width: 100%;
  max-width: 20rem;
`;

const VolumeControl = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #ffffff;
  font-size: 1rem;

  input[type="range"] {
    flex-grow: 1;
    -webkit-appearance: none;
    width: 100%;
    height: 8px;
    background: #550080;
    border-radius: 5px;
    outline: none;

    &::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #8e2de2;
      cursor: pointer;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }

    &::-moz-range-thumb {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #8e2de2;
      cursor: pointer;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }
  }
`;

export default App;
