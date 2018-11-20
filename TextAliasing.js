//=============================================================================
// TextAliasing.js
// ----------------------------------------------------------------------------
// Version
// 1.0 2018/07/04 初版
// ----------------------------------------------------------------------------
//=============================================================================
/*:ja
 * @plugindesc テキストのアンチエイリアスを軽減するプラグイン
 * @author ﾌﾆｰﾁｪ
 *
 * @param bai
 * @text 拡縮率
 * @type number
 * @default 16
 * @desc 拡縮率を決めます。値が大きいほど非AAになりますが処理に時間が掛かります　16または2のn乗の値推奨
 * @min 1
 * @max 64
 *
 * @param fontSizeBase
 * @text フォントサイズ　※要確認
 * @type number
 * @default 16
 * @desc 使用するフォントのサイズを指定します。16pxであれば16、12pxであれば12を入力してください
 * @min 4
 * @max 32
 *
 * @param drawOutLine
 * @text アウトラインの指定
 * @type select
 * @desc アウトライン描画の指定です。+で十字方向に、Xで斜め十字、米で+とX両方を適用します。無しは描画しません
 * @option 無し
 * @value NONE
 * @option +
 * @value TASU
 * @option X
 * @value KAKERU
 * @option 米
 * @value KOME
 * @default TASU
 *
 * @help
 * パラメータのフォントサイズは使いたいフォントのサイズを確認の上
 * 設定してください。
 * 
 * プラグインコマンド詳細
 *   イベントコマンド「プラグインコマンド」から実行します。
 * 
 * ------------------
 * アウトラインを描画するかどうか
 * ------------------
 * TEXT_ALIASING_OUTLINE [NONE か TASU か KAKERU か KOME]
 *   
 * ・アウトラインの描画をどうするかを決められます。
 *   切り替えた場合、それ以降のテキスト全てに反映されます。
 *   NONE:  アウトライン無し
 *   TASU:  十字方向にアウトラインが広がります
 *   KAKERU:斜め十字方向にアウトラインが広がります
 *   KOME:  TASUとKAKERUの両方が適用されます
 * 
 * 
 * ・利用規約は特にありません　自由に使ってね
 */

(function () {

    var param = JSON.parse(JSON.stringify(PluginManager.parameters('TextAliasing'), function (key, value) {
        try {
            return JSON.parse(value);
        } catch (e) {
            try {
                return eval(value);
            } catch (e) {
                return value;
            }
        }
    }));

    var bai = param.bai;
    var fontSizeBase = param.fontSizeBase;
    var drawOutLine = param.drawOutLine;

    var _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function (command, args) {
        _Game_Interpreter_pluginCommand.call(this, command, args);

        if (command == 'TEXT_ALIASING_OUTLINE') {
            drawOutLine = args[0];
            return;
        }
    }


    // フォントサイズを28に最も近い整数倍にする
    Window_Base.prototype.standardFontSize = function () {
        //return 28;
        return Math.round(28 / fontSizeBase) * fontSizeBase;
    };

    // 既存のアウトライン描画処理を省く
    Bitmap.prototype.drawText = function (text, x, y, maxWidth, lineHeight, align) {
        // Note: Firefox has a bug with textBaseline: Bug 737852
        //       So we use 'alphabetic' here.
        if (text !== undefined) {
            var tx = x;
            var ty = y + lineHeight - (lineHeight - this.fontSize * 0.7) / 2;
            var context = this._context;
            var alpha = context.globalAlpha;
            maxWidth = maxWidth || 0xffffffff;
            if (align === 'center') {
                tx += maxWidth / 2;
            }
            if (align === 'right') {
                tx += maxWidth;
            }
            context.save();
            context.font = this._makeFontNameText();
            context.textAlign = align;
            context.textBaseline = 'alphabetic';
            // 独自のアウトライン描画に変更するので省く
            // ---------------------------------
            //context.globalAlpha = 1;
            //this._drawTextOutline(text, tx, ty, maxWidth);
            // ---------------------------------
            context.globalAlpha = alpha;
            this._drawTextBody(text, tx, ty, maxWidth);
            context.restore();
            this._setDirty();
        }
    };

    // テキストの描画
    Bitmap.prototype._drawTextBody = function (text, tx, ty, maxWidth) {
        var context = this._context;
        context.fillStyle = this.textColor;

        var b = new Bitmap(this.measureTextWidth(text) * bai, this.fontSize * bai * 1.2);
        var ctx = b.context;
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = this.textColor;
        b.fontSize = this.fontSize * bai;
        ctx.font = b._makeFontNameText();
        b.fontSize /= bai;
        ctx.beginPath();
        ctx.fillText(text, 0, this.fontSize * bai);

        var x = 0;
        switch (this.context.textAlign) {
            case 'center': x = this.measureTextWidth(text) / 2; break;
            case 'right': x = this.measureTextWidth(text); break;
        }

        context.globalCompositeOperation = 'source-over';
        context.drawImage(b._canvas, 0, 0, b.width, this.fontSize * bai * 1.2, tx - x, ty - this.fontSize, b.width / bai, this.fontSize * 1.2);

        // 独自のアウトライン描画
        if (drawOutLine == 'TASU' || drawOutLine == 'KAKERU' || drawOutLine == 'KOME') {
            var gap = Math.floor(this.fontSize / fontSizeBase);

            ctx.globalCompositeOperation = 'source-atop';
            ctx.fillStyle = this.outlineColor;
            ctx.fillRect(0, 0, b.width, b.height);
            context.globalCompositeOperation = 'destination-over';

            if (drawOutLine == 'TASU' || drawOutLine == 'KOME') {
                context.drawImage(b._canvas, 0, 0, b.width, this.fontSize * bai * 1.2, tx - x - gap, ty - this.fontSize, b.width / bai, this.fontSize * 1.2);
                context.drawImage(b._canvas, 0, 0, b.width, this.fontSize * bai * 1.2, tx - x + gap, ty - this.fontSize, b.width / bai, this.fontSize * 1.2);
                context.drawImage(b._canvas, 0, 0, b.width, this.fontSize * bai * 1.2, tx - x, ty - this.fontSize - gap, b.width / bai, this.fontSize * 1.2);
                context.drawImage(b._canvas, 0, 0, b.width, this.fontSize * bai * 1.2, tx - x, ty - this.fontSize + gap, b.width / bai, this.fontSize * 1.2);
            }
            if (drawOutLine == 'KAKERU' || drawOutLine == 'KOME') {
                context.drawImage(b._canvas, 0, 0, b.width, this.fontSize * bai * 1.2, tx - x - gap, ty - this.fontSize - gap, b.width / bai, this.fontSize * 1.2);
                context.drawImage(b._canvas, 0, 0, b.width, this.fontSize * bai * 1.2, tx - x - gap, ty - this.fontSize + gap, b.width / bai, this.fontSize * 1.2);
                context.drawImage(b._canvas, 0, 0, b.width, this.fontSize * bai * 1.2, tx - x + gap, ty - this.fontSize - gap, b.width / bai, this.fontSize * 1.2);
                context.drawImage(b._canvas, 0, 0, b.width, this.fontSize * bai * 1.2, tx - x + gap, ty - this.fontSize + gap, b.width / bai, this.fontSize * 1.2);
            }
        }
    };







})();
