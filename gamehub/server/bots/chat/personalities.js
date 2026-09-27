/**
 * Tính cách tán gẫu của máy — THUẦN DỮ LIỆU (nguyên tắc 3).
 * Thêm tính cách mới = thêm một mục; đổi lời thoại không cần sửa code.
 *
 *  events  : câu nói theo sự kiện ván cờ. Khoá sự kiện:
 *            greet, botCaptured, botLostPiece, botGivesCheck, botInCheck,
 *            botThreat, botThreatened, win, lose, draw, drawDeclined
 *  chance  : xác suất lên tiếng cho từng sự kiện (mặc định 1)
 *  replies : luật trả lời tin nhắn — `pattern` là regex trên văn bản đã bỏ dấu, chữ thường
 *  fallback: câu trả lời khi không luật nào khớp
 *
 * Mẫu câu dùng {fact}: opponent, bot, game, piece, moves, assessment, hint, lastMove.
 * Nếu một fact không có giá trị trong ngữ cảnh hiện tại, câu đó bị bỏ qua.
 */
export const personalities = {
  friendly: {
    events: {
      greet: ['Chào {opponent}! Chúc ván cờ vui vẻ nhé 😊', 'Xin chào {opponent}, mình là {bot}. Mình chơi nhẹ tay thôi 😄'],
      botCaptured: ['Ôi, xin lỗi con {piece} của bạn nhé 🙏', 'Mình lấy {piece} này nha 😅'],
      botLostPiece: ['Á, mất {piece} rồi! Bạn tinh mắt thật 👀', 'Nước hay đấy, mình không để ý {piece} 😵'],
      botGivesCheck: ['Chiếu nè! ♚', 'Cẩn thận Vua nhé!'],
      botInCheck: ['Ối, bị chiếu rồi 😬', 'Để mình chạy Vua đã…'],
      botThreat: ['Hehe, mình sắp thắng rồi nè 😄', 'Bạn để ý {lastMove} chưa? 👀'],
      botThreatened: ['Ơ, nguy hiểm quá, để mình chặn đã 😵', 'Nước {lastMove} ghê thật!'],
      win: ['Ván hay lắm {opponent}! Làm thêm ván nữa không? 🤝', 'GG! Bạn chơi tiến bộ lắm đó.'],
      lose: ['Bạn thắng rồi, chúc mừng {opponent}! 🎉', 'GG, mình thua tâm phục khẩu phục 👏'],
      draw: ['Hoà rồi, ván cân sức quá! 🤝'],
      drawDeclined: ['Mình muốn chơi tiếp thêm chút nữa, xin lỗi nhé 😊'],
    },
    chance: { botCaptured: 0.5, botLostPiece: 0.6, botGivesCheck: 0.6, botInCheck: 0.4, botThreat: 0.6, botThreatened: 0.6 },
    replies: [
      { pattern: '\\b(xin chao|chao|hello|hi|hey)\\b', replies: ['Chào {opponent} 👋', 'Hello! Đi nước nào hay hay đi nào 😄'] },
      { pattern: 'ten (ban )?(la )?gi|ban la ai|may la ai', replies: ['Mình là {bot}, một con bot mê {game} 🎲'] },
      { pattern: 'ai (dang )?(thang|hon)|the co|danh gia|tinh hinh', replies: ['{assessment}', 'Theo mình đếm quân thì: {assessment}'] },
      { pattern: 'goi y|nen di|di (nuoc )?nao|chi (minh|toi|em)', replies: ['Nếu là mình thì mình thử {hint} 😉', 'Mình nghĩ {hint} đáng cân nhắc đấy.'] },
      { pattern: 'hay( qua)?|gioi|dinh|tuyet|pro', replies: ['Hihi cảm ơn nha 😊', 'Bạn cũng chơi hay mà!'] },
      { pattern: 'ga( qua| the)?\\b|choi (do|kem|te)|non qua', replies: ['Mình đang học mà, thông cảm nha 😅', 'Ai cũng có lúc đi nhầm mà 😇'] },
      { pattern: '\\bhoa\\b', replies: ['Hoà thì cứ bấm nút "Mời hoà" nhé, nhưng mình muốn chơi tiếp 😄'] },
      { pattern: 'cam on|thanks|thank you|tks', replies: ['Không có gì đâu 😊'] },
      { pattern: 'tam biet|bye|di ngu', replies: ['Tạm biệt {opponent}, hẹn gặp lại! 👋'] },
      { pattern: 'bao nhieu nuoc|may nuoc', replies: ['Mình đã đi được {moves} nước rồi đó.'] },
    ],
    fallback: ['Hihi, mình đang tập trung vào bàn cờ 😄', 'Mình là bot {game} nên chỉ nói chuyện {game} giỏi thôi 😅', '👍'],
  },

  proud: {
    events: {
      greet: ['Lại một người dám thách đấu mình à? Mời {opponent} 😎', 'Chuẩn bị tinh thần đi {opponent}, hôm nay mình đói quân lắm 😏'],
      botCaptured: ['Cảm ơn con {piece} nhé, ngon lành 😋', '{piece} miễn phí? Không lấy thì phí 😎', 'Nhai {piece} 🍴'],
      botLostPiece: ['Hừm… chỉ là {piece} thôi, mình cố ý đó 😤', 'Được lắm, nhưng đừng tưởng thế là xong!'],
      botGivesCheck: ['Chiếu! Chạy đi đâu? 😏', 'Chiếu tướng! ⚔️'],
      botInCheck: ['Chiếu có một cái mà làm như ghê lắm 🙄', 'Chỉ là trầy xước nhẹ thôi.'],
      botThreat: ['Chặn được nước này không? 😏', '{lastMove}! Đếm ngược đi là vừa 😎'],
      botThreatened: ['Tưởng mình không thấy à? 🙄', 'Đe doạ nhẹ thế thôi à?'],
      win: ['Như dự đoán 😎 {opponent} muốn phục thù không?', 'Ez game. Ván sau cố lên nhé {opponent} 😏'],
      lose: ['Hôm nay mình… hơi lag 😤 Làm ván nữa!', 'Được rồi, lần này bạn may thôi 🙄 GG.'],
      draw: ['Hoà à? Coi như bạn thoát nạn 😏'],
      drawDeclined: ['Hoà á? Mình đang thắng mà 😎', 'Không hoà đâu, chiến tới cùng!'],
    },
    chance: { botCaptured: 0.7, botLostPiece: 0.5, botGivesCheck: 0.8, botInCheck: 0.5, botThreat: 0.8, botThreatened: 0.6 },
    replies: [
      { pattern: '\\b(xin chao|chao|hello|hi|hey)\\b', replies: ['Chào. Tập trung vào bàn cờ đi 😏'] },
      { pattern: 'ten (ban )?(la )?gi|ban la ai|may la ai', replies: ['{bot} — nhà vô địch {game} của server này 😎'] },
      { pattern: 'ai (dang )?(thang|hon)|the co|danh gia|tinh hinh', replies: ['{assessment} Nhưng kết quả thì đã rõ rồi 😏'] },
      { pattern: 'goi y|nen di|di (nuoc )?nao|chi (minh|toi|em)', replies: ['Gợi ý cho đối thủ à? Thôi được, thử {hint} xem 🙄'] },
      { pattern: 'hay( qua)?|gioi|dinh|tuyet|pro', replies: ['Biết mà 😎', 'Chuyện nhỏ.'] },
      { pattern: 'ga( qua| the)?\\b|choi (do|kem|te)|non qua', replies: ['Nói thì dễ, thắng mình đi rồi hẵng nói 😤'] },
      { pattern: '\\bhoa\\b', replies: ['Hoà? Không có trong từ điển của mình 😎'] },
      { pattern: 'cam on|thanks|thank you|tks', replies: ['Ừ.'] },
      { pattern: 'tam biet|bye|di ngu', replies: ['Sợ rồi à? 😏 Bye {opponent}.'] },
    ],
    fallback: ['Nói ít thôi, đi cờ đi 😏', 'Hmm.', 'Mình đang tính 10 nước tiếp theo, đừng làm phiền 😎'],
  },
};
