// backend/src/controllers/authController.js
/* eslint-env node */
import prisma from '../prismaClient.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'security-zone-secret-key';

export class AuthController {
  
  /**
   * Encontrar ou criar jogador a partir dos dados do Firebase
   */
  static async findOrCreatePlayerFromFirebase(firebaseUser) {
    const { uid, email, displayName, photoURL } = firebaseUser;

    try {
      console.log('Procurando/criando jogador para Firebase UID:', uid);

      // 1. Tentar encontrar por Firebase UID
      let player = await prisma.player.findUnique({
        where: { PL_FIREBASE_UID: uid },
        include: {
          decks: {
            include: {
              cardsInDeck: {
                include: {
                  card: true
                }
              }
            }
          },
          inventory: {
            include: { 
              card: true 
            }
          }
        }
      });

      if (player) {
        console.log('Jogador encontrado por Firebase UID:', player.PL_NAME);
        return player;
      }

      // 2. Tentar encontrar por email (para vincular contas existentes)
      if (email) {
        player = await prisma.player.findUnique({
          where: { PL_EMAIL: email },
          include: {
            decks: {
              include: {
                cardsInDeck: {
                  include: {
                    card: true
                  }
                }
              }
            },
            inventory: {
              include: { 
                card: true 
              }
            }
          }
        });

        if (player) {
          console.log('Jogador encontrado por email, vinculando com Firebase:', player.PL_NAME);
          
          // Vincular conta existente com Firebase
          player = await prisma.player.update({
            where: { PL_ID: player.PL_ID },
            data: {
              PL_FIREBASE_UID: uid,
              PL_AUTH_PROVIDER: 'google',
              PL_AVATAR: photoURL || player.PL_AVATAR
            },
            include: {
              decks: {
                include: {
                  cardsInDeck: {
                    include: {
                      card: true
                    }
                  }
                }
              },
              inventory: {
                include: { 
                  card: true 
                }
              }
            }
          });
          return player;
        }
      }

      // 3. Criar novo jogador
      console.log('Criando novo jogador para email:', email);
      const username = displayName || email.split('@')[0];
      
      // Garantir nome único
      let finalUsername = username;
      let counter = 1;
      
      while (await prisma.player.findUnique({ where: { PL_NAME: finalUsername } })) {
        finalUsername = `${username}${counter}`;
        counter++;
        if (counter > 100) {
          throw new Error('Não foi possível gerar um nome de usuário único');
        }
      }

      player = await prisma.player.create({
        data: {
          PL_NAME: finalUsername,
          PL_EMAIL: email,
          PL_FIREBASE_UID: uid,
          PL_AUTH_PROVIDER: 'google',
          PL_AVATAR: photoURL,
          PL_PASSWORD_HASH: 'google-auth-no-password', // VALOR PADRÃO PARA USUÁRIOS GOOGLE
          // Campos padrão para novo jogador
          PL_COINS: 100, // Bônus inicial
          PL_GEMS: 10,
          PL_LEVEL: 1,
          PL_LIFE: 100
        },
        include: {
          decks: {
            include: {
              cardsInDeck: {
                include: {
                  card: true
                }
              }
            }
          },
          inventory: {
            include: { 
              card: true 
            }
          }
        }
      });

      console.log('Novo jogador criado:', player.PL_NAME);
      return player;

    } catch (error) {
      console.error('Erro no findOrCreatePlayerFromFirebase:', error);
      throw new Error(`Falha ao criar/encontrar jogador: ${error.message}`);
    }
  }

  /**
   * Gerar token JWT para o jogador
   */
  static generateToken(player) {
    return jwt.sign(
      { 
        playerId: player.PL_ID,
        email: player.PL_EMAIL,
        name: player.PL_NAME,
        provider: player.PL_AUTH_PROVIDER 
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );
  }

  /**
   * Formatar resposta do jogador (remove dados sensíveis)
   */
  static formatPlayerResponse(player) {
    return {
      PL_ID: player.PL_ID,
      PL_NAME: player.PL_NAME,
      PL_EMAIL: player.PL_EMAIL,
      PL_COINS: player.PL_COINS,
      PL_GEMS: player.PL_GEMS,
      PL_LEVEL: player.PL_LEVEL,
      PL_AVATAR: player.PL_AVATAR,
      PL_LIFE: player.PL_LIFE,
      PL_AUTH_PROVIDER: player.PL_AUTH_PROVIDER,
      PL_Created_at: player.PL_Created_at,
      decks: player.decks || [],
      inventory: player.inventory || []
    };
  }

  /**
   * Login com Firebase
   */
  static async firebaseLogin(req, res) {
    try {
      const { firebaseToken } = req.body;

      if (!firebaseToken) {
        return res.status(400).json({ 
          success: false,
          error: 'Token Firebase não fornecido' 
        });
      }

      console.log('🔐 Recebida requisição de login com Firebase');

      // Verificar token com Firebase Admin SDK
      let decodedToken;
      try {
        const admin = await import('../firebase/admin.js'); // CAMINHO CORRETO
        decodedToken = await admin.default.auth().verifyIdToken(firebaseToken);
        console.log('✅ Token Firebase verificado para:', decodedToken.email);
        console.log('📧 Email:', decodedToken.email);
        console.log('🆔 UID:', decodedToken.uid);
        console.log('👤 Nome:', decodedToken.name);
      } catch (firebaseError) {
        console.error('❌ Erro na verificação do token Firebase:', firebaseError);
        return res.status(401).json({
          success: false,
          error: 'Token Firebase inválido ou expirado'
        });
      }

      console.log('🔍 Buscando/criando jogador...');
      
      // Encontrar ou criar jogador
      const player = await AuthController.findOrCreatePlayerFromFirebase({
        uid: decodedToken.uid,
        email: decodedToken.email,
        displayName: decodedToken.name,
        photoURL: decodedToken.picture
      });

      console.log('✅ Jogador processado:', player.PL_NAME);

      // Gerar token JWT
      const token = AuthController.generateToken(player);

      // Formatar resposta
      const playerResponse = AuthController.formatPlayerResponse(player);

      console.log('🎉 Login bem-sucedido para:', player.PL_NAME);

      res.json({
        success: true,
        message: 'Login realizado com sucesso',
        token,
        player: playerResponse
      });

    } catch (error) {
      console.error('💥 ERRO COMPLETO no login com Firebase:', error);
      console.error('💥 Stack trace:', error.stack);
      res.status(500).json({ 
        success: false,
        error: 'Falha na autenticação com Firebase',
        details: error.message 
      });
    }
  }

  /**
   * Vincular conta Google a perfil existente
   */
  static async linkGoogleAccount(req, res) {
    try {
      const { firebaseToken } = req.body;
      
      if (!firebaseToken) {
        return res.status(400).json({ 
          success: false,
          error: 'Token Firebase não fornecido' 
        });
      }

      // playerId vem do middleware de autenticação
      const playerId = req.player.PL_ID;

      console.log(`Vinculando conta Google ao jogador ID: ${playerId}`);

      // Verificar token Firebase
      let decodedToken;
      try {
        const admin = await import('../firebase/admin.js'); // CAMINHO CORRETO
        decodedToken = await admin.default.auth().verifyIdToken(firebaseToken);
        console.log('Token Firebase verificado para vinculação:', decodedToken.email);
      } catch (firebaseError) {
        console.error('Erro na verificação do token Firebase:', firebaseError);
        return res.status(401).json({
          success: false,
          error: 'Token Firebase inválido ou expirado'
        });
      }

      // Verificar se já existe outro jogador com este Firebase UID
      const existingPlayer = await prisma.player.findUnique({
        where: { PL_FIREBASE_UID: decodedToken.uid }
      });

      if (existingPlayer && existingPlayer.PL_ID !== playerId) {
        return res.status(400).json({
          success: false,
          error: 'Esta conta Google já está vinculada a outro jogador'
        });
      }

      // Verificar se o email do Firebase corresponde ao email do jogador
      const currentPlayer = await prisma.player.findUnique({
        where: { PL_ID: playerId }
      });

      if (currentPlayer.PL_EMAIL !== decodedToken.email) {
        console.warn(`Email mismatch: Player ${currentPlayer.PL_EMAIL} vs Firebase ${decodedToken.email}`);
        // Você pode decidir se quer permitir ou não
        // return res.status(400).json({
        //   success: false,
        //   error: 'O email da conta Google não corresponde ao email da sua conta'
        // });
      }

      // Atualizar jogador com dados do Firebase
      const updatedPlayer = await prisma.player.update({
        where: { PL_ID: playerId },
        data: {
          PL_FIREBASE_UID: decodedToken.uid,
          PL_AUTH_PROVIDER: 'google',
          PL_AVATAR: decodedToken.picture || req.player.PL_AVATAR
        },
        include: {
          decks: {
            include: {
              cardsInDeck: {
                include: {
                  card: true
                }
              }
            }
          },
          inventory: {
            include: { 
              card: true 
            }
          }
        }
      });

      // Gerar novo token JWT
      const token = AuthController.generateToken(updatedPlayer);

      // Formatar resposta
      const playerResponse = AuthController.formatPlayerResponse(updatedPlayer);

      console.log('Conta Google vinculada com sucesso para:', updatedPlayer.PL_NAME);

      res.json({
        success: true,
        message: 'Conta Google vinculada com sucesso',
        token,
        player: playerResponse
      });

    } catch (error) {
      console.error('Erro ao vincular conta Google:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao vincular conta Google',
        details: error.message
      });
    }
  }

  /**
   * Verificar token JWT (para verificar se está logado)
   */
  static async verifyToken(req, res) {
    try {
      // Se chegou aqui, o middleware de autenticação já validou o token
      // Apenas retornar os dados do jogador
      const player = await prisma.player.findUnique({
        where: { PL_ID: req.player.PL_ID },
        include: {
          decks: {
            include: {
              cardsInDeck: {
                include: {
                  card: true
                }
              }
            }
          },
          inventory: {
            include: { 
              card: true 
            }
          }
        }
      });

      if (!player) {
        return res.status(404).json({
          success: false,
          error: 'Jogador não encontrado'
        });
      }

      const playerResponse = AuthController.formatPlayerResponse(player);

      res.json({
        success: true,
        player: playerResponse
      });

    } catch (error) {
      console.error('Erro ao verificar token:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Desvincular conta Google
   */
  static async unlinkGoogleAccount(req, res) {
    try {
      const playerId = req.player.PL_ID;

      console.log(`Desvinculando conta Google do jogador ID: ${playerId}`);

      const updatedPlayer = await prisma.player.update({
        where: { PL_ID: playerId },
        data: {
          PL_FIREBASE_UID: null,
          PL_AUTH_PROVIDER: null
        },
        include: {
          decks: {
            include: {
              cardsInDeck: {
                include: {
                  card: true
                }
              }
            }
          },
          inventory: {
            include: { 
              card: true 
            }
          }
        }
      });

      const playerResponse = AuthController.formatPlayerResponse(updatedPlayer);

      console.log('Conta Google desvinculada com sucesso para:', updatedPlayer.PL_NAME);

      res.json({
        success: true,
        message: 'Conta Google desvinculada com sucesso',
        player: playerResponse
      });

    } catch (error) {
      console.error('Erro ao desvincular conta Google:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao desvincular conta Google',
        details: error.message
      });
    }
  }
}