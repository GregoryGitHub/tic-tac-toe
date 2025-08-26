export type Player = { id: string; name: string; symbol: 'X' | 'O' };
export type CellValue = 'X' | 'O' | null;
export type Board = CellValue[][];

export class TicTacToeGame {
  private board: Board;
  private players: Player[] = [];
  private currentPlayerIndex: number = 0;
  private winner: Player | null = null;
  private gameEnded: boolean = false;

  constructor() {
    this.board = Array(3).fill(null).map(() => Array(3).fill(null));
  }

  addPlayer(id: string, name: string): Player | null {
    if (this.players.length < 2) {
      const symbol = this.players.length === 0 ? 'X' : 'O';
      const newPlayer: Player = { id, name, symbol };
      this.players.push(newPlayer);
      return newPlayer;
    }
    return null;
  }

  getPlayers(): Player[] {
    return this.players;
  }

  getBoard(): Board {
    return this.board;
  }

  getCurrentPlayer(): Player | null {
    return this.players[this.currentPlayerIndex] || null;
  }

  makeMove(playerId: string, row: number, col: number): boolean {
    if (this.gameEnded || this.winner) {
      return false; // Game already ended or has a winner
    }

    const currentPlayer = this.getCurrentPlayer();
    if (!currentPlayer || currentPlayer.id !== playerId) {
      return false; // Not current player's turn
    }

    if (row < 0 || row >= 3 || col < 0 || col >= 3 || this.board[row][col] !== null) {
      return false; // Invalid move
    }

    this.board[row][col] = currentPlayer.symbol;
    if (this.checkWin(currentPlayer.symbol)) {
      this.winner = currentPlayer;
      this.gameEnded = true;
    } else if (this.checkDraw()) {
      this.gameEnded = true;
    } else {
      this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
    }
    return true;
  }

  getWinner(): Player | null {
    return this.winner;
  }

  isGameEnded(): boolean {
    return this.gameEnded;
  }

  private checkWin(symbol: 'X' | 'O'): boolean {
    // Check rows
    for (let i = 0; i < 3; i++) {
      if (this.board[i][0] === symbol && this.board[i][1] === symbol && this.board[i][2] === symbol) return true;
    }

    // Check columns
    for (let i = 0; i < 3; i++) {
      if (this.board[0][i] === symbol && this.board[1][i] === symbol && this.board[2][i] === symbol) return true;
    }

    // Check diagonals
    if (this.board[0][0] === symbol && this.board[1][1] === symbol && this.board[2][2] === symbol) return true;
    if (this.board[0][2] === symbol && this.board[1][1] === symbol && this.board[2][0] === symbol) return true;

    return false;
  }

  private checkDraw(): boolean {
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (this.board[i][j] === null) {
          return false;
        }
      }
    }
    return !this.winner; // It's a draw only if there's no winner and all cells are filled
  }

  resetGame(): void {
    this.board = Array(3).fill(null).map(() => Array(3).fill(null));
    this.currentPlayerIndex = 0;
    this.winner = null;
    this.gameEnded = false;
    // Players remain the same, as they can play another round.
  }
}

