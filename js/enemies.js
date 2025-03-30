/*
    ~ - новый абзац
    % - задержка текста
    &n - триггер actions 
    @n - цвет
    ^ - тряска
    $ - волна
    #n - лицо
*/

class Enemy
{
    constructor()
    {
        this.code = 'noone';
        this.name = loc.Get('enemies', 'noone');
        this.index = {x: 0, y: 0};
        this.sprite = null;

        this.hp = 0;
        this.maxHP = 5;

        this.alive = true;
        this.attacks = [TestAttack];

        this.actions = [
            {name: loc.Get('actions', 'check'), index: {x: 0, y: 0}, action: this.Check.bind(this)},
        ];
    }

    Dial(_reference)
    {
        return loc.Dial(this.code, _reference);
    }

    Start()
    {
        this.alive = true;
        this.hp = this.maxHP;

        this.attackCounter = 0;

        if(this.sprite)
            this.sprite.Start();
    }

    CreateSprite(_x, _y)
    {
        this.sprite = new EnemySprite(_x, _y, 200, 300, this);
        return this.sprite;
    }

    GetAttack()
    {
        let attackClass = this.attacks[this.attackCounter % this.attacks.length];
        this.attackCounter++;

        return {
            attackClass,
            difficulty: 1
        }
    }

    Die()
    {
        this.alive = false;
        //this.sprite.SetAnimation(STATE_DEAD, 0);
    }

    Idle()
    {
        return {
            text: this.Dial('idle')
        }
    }

    DealDamage(_damage)
    {
        this.hp -= _damage;
        if(this.hp < 0)
            this.hp = 0;

        return _damage;
    }
    Hurt(_damage)
    {
        return {};
    }
    AttackEnd()
    {
        return {};
    }
    Drawn(_len)
    {
        return {};
    }

    Check()
    {
        return {
            text: this.Dial('check'),
        };
    }

    StoryFlow()
    {
        return null;
    }
}

class EnemySprite extends Entity
{
    constructor(_x, _y, _w, _h, _enemy)
    {
        super(_x, _y, _w, _h);

        this.enemy = _enemy;

        this.state = STATE_NORMAL;
        this.animationTime = 0;

        this.expression = '0';

        this.speaking = false;
        this.speechBubble = new SpeechBubble(this, res.sfx.duck);
    }

    Start()
    {
        this.speechBubble.Start();
    }

    SetAnimation(_state, _time)
    {
        this.state = _state;
        this.animationTime = _time;
    }
    SetExpression(_index)
    {
        this.expression = _index;
    }
    ResetExpression()
    {
        this.expression = '0';
    }

    SetSpeechBubble(_text, _actions)
    {
        this.speaking = true;
        this.speechBubble.SetText(_text);
        this.speechBubble.SetActions(_actions);
    }

    GameLoop(_delta)
    {
        if(this.speaking)
        {
            this.speechBubble.GameLoop(_delta);

            if(this.speechBubble.finished)
                this.speaking = false;
        }
    }

    Render(_ctx, _dt)
    {
        this.Draw(_ctx, _dt);
    }
    
    Draw(_ctx, _dt)
    {
        let shake = 0;

        if(this.state == STATE_HURT)
            shake = Math.sin(_dt / 20) * (20 * this.animationTime);

        _ctx.fillStyle = 'red';
        _ctx.fillRect(this.x + shake, this.y, this.w, this.h);
    }
}

class PromoDuckSprite extends EnemySprite
{
    constructor(_x, _y, _enemy)
    {
        super(_x, _y, 300, 300, _enemy);
        
        this.stakeShown = true;
        this.stakeShield = 0;

        this.deltaTime = 80;
        this.deltaStickTime = 40;
        this.deltas = [];

        this.positionLocked = false;
        
        this.vandalismCanvas = document.createElement('canvas');
        this.vandalismCanvas.width = 360;
        this.vandalismCanvas.height = 305;
        this.vandalismCtx = this.vandalismCanvas.getContext('2d');
        this.vandalismCtx.imageSmoothingEnabled = false;
        this.vandalismCtx.lineCap = this.vandalismCtx.lineJoin = 'round';
        this.vandalismCtx.translate(.5, .5);

        //this.vandalismCtx.fillStyle = 'red';
        //this.vandalismCtx.fillRect(0, 0, this.vandalismCanvas.width, this.vandalismCanvas.height);
    }

    ResetExpression()
    {
        if(this.enemy.drawAttempt == 2)
            this.expression = '3';
        else
            super.ResetExpression();
    }

    GameLoop(_delta)
    {
        super.GameLoop(_delta);

        if(this.positionLocked)
        {
            if(battle.mode.id != DRAW && battle.mode.id != ATTACK && battle.mode.id != POST_ATTACK && battle.boundsReady)
                this.positionLocked = false;
        }

        for(let i = this.deltas.length - 1; i >= 0; i--)
        {
            this.deltas[i].timer -= 1 * _delta;

            if(this.deltas[i].timer <= 0)
                this.deltas.splice(i, 1);
        }
    }

    AddDelta(_delta)
    {
        this.deltas.push({delta: _delta, timer: this.deltaTime});
    }

    Draw(_ctx, _dt)
    {
        if(!this.positionLocked)
        {
            this.y = battle.bounds.y1 - this.h;
            if(this.y < 0)
                this.y = 0;
        }

        let harmed = this.enemy.weakened > 0;

        let t = _dt / 150;
        if(harmed)
            t = _dt / 250;

        let bodyWobble = {
            x: 0,
            y: ~~(Math.sin(t) * 3)
        };
        let armWobble = {
            x: 0,
            y: ~~(Math.sin(t) * 2 + bodyWobble.y)
        };
        let headWobble = {
            x: ~~(Math.cos(t) * 3 + bodyWobble.x),
            y: ~~(Math.sin(t) * 2.5 + bodyWobble.y)
        };

        if(this.state == STATE_DEAD)
        {
            let frames = res.sheets.duck.GetTagFrames('death');
            let frame = Math.round(frames.length * this.animationTime);
            if(frame < frames.length)
                res.sheets.duck.Draw(_ctx, 'head', frames[frame], this.x, this.y);
        }
        else if(this.enemy.weakened >= 4)
        {
            res.sheets.duck.Draw(_ctx, 'shadow', 0, this.x, this.y);
            res.sheets.duck.Draw(_ctx, 'body', 4, this.x, this.y);
        }
        else if(this.state == STATE_HURT)
        {
            let shake = Math.sin(_dt / 20) * (20 * this.animationTime);
            res.sheets.duck.Draw(_ctx, 'body', harmed ? 3 : 1, this.x + shake, this.y);
            res.sheets.duck.Draw(_ctx, 'head', harmed ? 15 : 2, this.x + shake * 1.5, this.y);
        }
        else if(this.state == STATE_DRAW)
        {
            headWobble.x = 0;
            headWobble.y = ~~(Math.sin(t) * 5 + bodyWobble.y);

            let drawWobble = {
                x: ~~(Math.cos(_dt / 50) * 5 + armWobble.x),
                y: ~~(Math.sin(_dt / 50) * 5 + armWobble.y)
            };

            res.sheets.duck.Draw(_ctx, 'shadow', 0, this.x, this.y);
            res.sheets.duck.Draw(_ctx, 'arm_back', 0, this.x + armWobble.x, this.y + armWobble.y);
            res.sheets.duck.Draw(_ctx, 'feet', 1, this.x, this.y);

            res.sheets.duck.Draw(_ctx, 'body', 0, this.x + bodyWobble.x, this.y + bodyWobble.y);
            res.sheets.duck.Draw(_ctx, 'arm_front', 1, this.x + drawWobble.x, this.y + drawWobble.y);

            res.sheets.duck.Draw(_ctx, 'head', 8, this.x + headWobble.x, this.y + headWobble.y);
        }
        else if(this.state == STATE_SHIELDING || this.state == STATE_UNSHIELDING)
        {
            let x = this.x;
            if(this.animationTime < .3)
            {
                x = this.x - (this.x - battle.defaultBounds.x1) * this.animationTime / .3;
            }
            else if(this.animationTime < .5)
            {
                x = battle.defaultBounds.x1;
                this.stakeShield = 1;
            }
            else if(this.animationTime < .9)
            {
                x = battle.defaultBounds.x1 - (battle.defaultBounds.x1 - this.x) * (this.animationTime - .5) / .4;
            }

            res.sheets.duck.Draw(_ctx, 'shadow', 0, x, this.y);
            res.sheets.duck.Draw(_ctx, 'arm_back', 2, x, this.y);
            res.sheets.duck.Draw(_ctx, 'feet', 2, x, this.y);

            res.sheets.duck.Draw(_ctx, 'hair', 1, x, this.y);

            res.sheets.duck.Draw(_ctx, 'body', 2, x, this.y);

            res.sheets.duck.Draw(_ctx, 'arm_front', 2, x, this.y);

            res.sheets.duck.Draw(_ctx, 'head', res.sheets.duck.GetTagFrame('expression_5'), x, this.y);
        }
        else if(this.state == STATE_BYE)
        {
            let eatWobble = {
                x: ~~(Math.cos(_dt / 25) * 2 + armWobble.x),
                y: ~~(Math.sin(_dt / 25) * 2 + armWobble.y)
            };

            headWobble.x = 0;
            
            res.sheets.duck.Draw(_ctx, 'shadow', 0, this.x, this.y);
            res.sheets.duck.Draw(_ctx, 'arm_back', 0, this.x + armWobble.x, this.y + armWobble.y);
            res.sheets.duck.Draw(_ctx, 'feet', 0, this.x, this.y);

            res.sheets.duck.Draw(_ctx, 'body', 0, this.x + bodyWobble.x, this.y + bodyWobble.y);
                
            if(this.animationTime >= 1.3)
            {
                let y = headWobble.y - Utils.CurvePos({x: 0, y: 0}, {x: 0, y: 0}, -5, this.animationTime / 1.7).y;
                res.sheets.duck.Draw(_ctx, 'hair', 0, this.x + headWobble.x, this.y + y);
                res.sheets.duck.Draw(_ctx, 'arm_front', 0, this.x + armWobble.x, this.y + armWobble.y);
                res.sheets.duck.Draw(_ctx, 'head', 0, this.x + headWobble.x, this.y + y);
            }
            else if(this.animationTime >= 1)
            {
                res.sheets.duck.Draw(_ctx, 'hair', 0, this.x + eatWobble.x, this.y + eatWobble.y);
                res.sheets.duck.Draw(_ctx, 'arm_front', 0, this.x + armWobble.x, this.y + armWobble.y);
                res.sheets.duck.Draw(_ctx, 'head', 0, this.x + eatWobble.x, this.y + eatWobble.y);
            }
            else if(this.animationTime >= .3)
            {
                res.sheets.duck.Draw(_ctx, 'hair', 0, this.x + headWobble.x, this.y + headWobble.y + (_dt % 200 > 100 ? -3 : 0));
                res.sheets.duck.Draw(_ctx, 'arm_front', 0, this.x + armWobble.x, this.y + armWobble.y);
                res.sheets.duck.Draw(_ctx, 'head', _dt % 200 > 100 ? 1 : 0, this.x + headWobble.x, this.y + headWobble.y);
                
                let x = this.x + 133;
                let y = this.y + 142;
                let t = (this.animationTime - .3) / .25 % .8;
                let i = ~~((this.animationTime - .3) / .25 / .8);

                let pos1, pos2, pos3;
                if(i % 3 == 0)
                {
                    pos1 = Utils.CurvePos({x, y}, {x: x + 130, y: _ctx.canvas.height}, 200, t);
                    pos2 = Utils.CurvePos({x, y}, {x: x - 130, y: _ctx.canvas.height}, 300, t);
                    pos3 = Utils.CurvePos({x, y}, {x: x + 20, y: _ctx.canvas.height}, 150, t);
                }
                else if(i % 3 == 1)
                {
                    pos1 = Utils.CurvePos({x, y}, {x: x + 70, y: _ctx.canvas.height}, 100, t);
                    pos2 = Utils.CurvePos({x: x - 20, y}, {x: x - 50, y: _ctx.canvas.height}, 200, t);
                    pos3 = Utils.CurvePos({x: x + 30, y}, {x: x - 20, y: _ctx.canvas.height}, 300, t);
                }
                else
                {
                    pos1 = Utils.CurvePos({x: x + 20, y}, {x: x, y: _ctx.canvas.height}, 250, t);
                    pos2 = Utils.CurvePos({x: x - 30, y}, {x: x - 80, y: _ctx.canvas.height}, 150, t);
                    pos3 = Utils.CurvePos({x, y}, {x: x + 20, y: _ctx.canvas.height}, 100, t);
                }
                
                _ctx.save();
                _ctx.translate(pos1.x, pos1.y);
                _ctx.rotate(Math.PI * t * 2);
                _ctx.drawImage(res.sprites.soulbreak, 0, 50, 9, 12, -4.5, -6, 9, 12);
                _ctx.restore();

                _ctx.save();
                _ctx.translate(pos2.x, pos2.y);
                _ctx.rotate(-Math.PI * t * 1.5);
                _ctx.drawImage(res.sprites.soulbreak, 10, 51, 12, 13, -6, -7.5, 12, 13);
                _ctx.restore();

                _ctx.save();
                _ctx.translate(pos3.x, pos3.y);
                _ctx.rotate(Math.PI * t);
                _ctx.drawImage(res.sprites.soulbreak, 22, 54, 8, 8, -4, -4, 8, 8);
                _ctx.restore();
            }
            else if(this.animationTime > .2)
            {
                res.sheets.duck.Draw(_ctx, 'hair', 3, this.x + headWobble.x, this.y + headWobble.y);
                res.sheets.duck.Draw(_ctx, 'head', res.sheets.duck.GetTagFrame('eat_2'), this.x + headWobble.x, this.y + headWobble.y);
                res.sheets.duck.Draw(_ctx, 'arm_more', 0, this.x + eatWobble.x, this.y + eatWobble.y);
            }
            else if(this.animationTime > .1)
            {
                res.sheets.duck.Draw(_ctx, 'hair', 2, this.x + headWobble.x, this.y + headWobble.y);
                res.sheets.duck.Draw(_ctx, 'arm_front', 7, this.x + eatWobble.x, this.y + eatWobble.y);
                res.sheets.duck.Draw(_ctx, 'head', res.sheets.duck.GetTagFrame('eat_1'), this.x + headWobble.x, this.y + headWobble.y);
            }
            else
            {
                res.sheets.duck.Draw(_ctx, 'arm_front', 6, this.x, this.y + armWobble.y);
                res.sheets.duck.Draw(_ctx, 'head', 8, this.x + headWobble.x, this.y + headWobble.y);
            }
        }
        else
        {
            let expression = this.expression;
            if(harmed && this.expression == '0')
                expression = '5';

            let headFrame = res.sheets.duck.GetTagFrame(`expression_${expression}`) || 0;

            let mouthOpen = false;
            if(!this.speechBubble.lineFinished && this.speechBubble.CanPronounce())
            {
                mouthOpen = this.speechBubble.value % 4 > 0;
                headFrame += mouthOpen ? 1 : 0;
            }

            let hairOffset = {
                x: 0,
                y: 0
            };
            switch(this.expression)
            {
                case '0':
                case '4':
                case 'C':
                case 'D':
                    if(mouthOpen)
                        hairOffset.y = -3;
                    break;

                case '9':
                    if(mouthOpen)
                    {
                        hairOffset.x = 2;
                        hairOffset.y = -2;
                    }
                    break;

                case 'B':
                    if(mouthOpen)
                        hairOffset.x = -1;
                    break;

                case 'G':
                    if(mouthOpen)
                    {
                        hairOffset.x = 2;
                        hairOffset.y = -4;
                    }
                    break;

                case '2':
                    headWobble.x = 0;
                    headWobble.y = 0;
                    break;
            }

            res.sheets.duck.Draw(_ctx, 'shadow', 0, this.x, this.y);
            res.sheets.duck.Draw(_ctx, 'arm_back', this.expression == 'G' ? 5 : this.expression == 'E' ? 4 : this.expression == 'B' ? 3 : harmed ? 2 : this.expression == '4' ? 1 : 0, this.x + armWobble.x, this.y + armWobble.y);
            res.sheets.duck.Draw(_ctx, 'feet', harmed ? 2 : 0, this.x, this.y);

            if(this.expression != '2')
                res.sheets.duck.Draw(_ctx, 'hair', harmed ? 1 : 0, this.x + hairOffset.x + headWobble.x, this.y + hairOffset.y + headWobble.y);

            res.sheets.duck.Draw(_ctx, 'body', harmed ? 2 : 0, this.x + bodyWobble.x, this.y + bodyWobble.y);

            if(this.expression != '6')
                res.sheets.duck.Draw(_ctx, 'arm_front', this.expression == 'G' ? 5 : this.expression == 'C' ? 4 : this.expression == 'B' ? 3 : harmed ? 2 : 0, this.x + armWobble.x, this.y + armWobble.y);

            res.sheets.duck.Draw(_ctx, 'head', headFrame, this.x + headWobble.x, this.y + headWobble.y);
        }

        //_ctx.drawImage(res.sprites.duck, offset, 0, 400, 400, this.x + shake, this.y, this.w, this.h);

        if(this.state == STATE_DRAW)
        {
            if(this.animationTime >= .3)
            {
                let t = (this.animationTime - .3) / (.6 - .3);
                if(t > 1)
                    t = 1;

                let k = this.y + 140 + 150;
                let h = 120 * t;
                let y = k - h;

                _ctx.save();
                _ctx.translate(this.x + 142, y);

                if(this.animationTime >= .65 && this.animationTime <= .75 || this.animationTime >= .8 && this.animationTime <= .85)
                {
                    _ctx.scale(-1, 1);
                    _ctx.translate(-114, 0);
                }

                _ctx.drawImage(res.sprites.scribble, (_dt % 500 < 250 ? 2 : 3) * 114, 0, 114, 120, 0, 0, 114, h);

                _ctx.restore();
            }
        }
        
        // промотка
        if(this.stakeShown)
        {
            let x = battle.defaultBounds.x1;
            let h = battle.defaultBounds.y1 - 25 - 25;
            let y = battle.defaultBounds.y1 - 25 - h;
    
            if(this.state == STATE_HANGING)
                y = -h + (h + 25) * this.animationTime;
            
            _ctx.save();
                _ctx.translate(x, y);

                if(this.stakeShield == 1)
                {
                    if((this.state == STATE_SHIELDING || this.state == STATE_UNSHIELDING) && this.animationTime < .9)
                    {
                        if(this.animationTime < .5)
                        {
                            x = battle.defaultBounds.x1 - 25;

                            if(this.state == STATE_SHIELDING)
                                y = y + 20 - y * Utils.Clamp((this.animationTime - .3) / .07, 0, 1);
                            else
                                y = y + 20;
                        }
                        else
                        {
                            x = battle.defaultBounds.x1 - (battle.defaultBounds.x1 - this.x) * (this.animationTime - .5) / .4;
                            y = this.y;
                        }
                    }
                    else if(this.state == STATE_HURT || this.state == STATE_BREAK)
                    {
                        x = this.x;
                        y = this.y;
                    }
                    else
                    {
                        x = this.x + bodyWobble.x;
                        y = this.y + bodyWobble.y;
                    }
        
                    _ctx.translate(x - 50, y + 100);
                    _ctx.translate(-250 / 2, -h / 2);
                }

                if(this.state != STATE_BREAK)
                {
                    _ctx.save();
                        let shake = 0;
                        if(this.state == STATE_HURT && this.stakeShield == 1)
                            shake = Math.sin(_dt / 20) * 10;
                        _ctx.translate(shake, 0);

                        this.DrawQV(_ctx, _dt, h);

                        if(this.stakeShield == 1 && (this.state != STATE_UNSHIELDING || this.animationTime >= .3))
                        {
                            res.sheets.duck.Draw(_ctx, 'arm_more', 1, -25, 0);
                            res.sheets.duck.Draw(_ctx, 'arm_more', 2, -25, 0);
                        }
                    _ctx.restore();
                }
                else
                {
                    let shake = 0;
                    if(this.animationTime < .3)
                        shake = Math.sin(_dt / 20) * (11 + 10 * this.animationTime / .3);
                    _ctx.translate(shake, 0);

                    let t = 0;
                    if(this.animationTime >= .3)
                    {
                        t = (this.animationTime - .3) / .5;
                        t = Utils.Clamp(t, 0, 1);
                    }
                    if(this.animationTime >= .8)
                    {
                        this.stakeShield = 2;
                        this.stakeShown = false;
                    }

                    let pos1 = Utils.CurvePos({x: 0, y: 0}, {x: -125, y: _ctx.canvas.height + 100}, 200, t);
                    let pos2 = Utils.CurvePos({x: 0, y: 0}, {x: 125, y: _ctx.canvas.height + 100}, 300, t);

                    _ctx.strokeStyle = '#000';
                    _ctx.lineWidth = 6;
                    // left
                    _ctx.save();
                        _ctx.beginPath();
                        _ctx.translate(pos1.x, pos1.y);
                        //_ctx.rotate(-Math.PI / 36);
                        _ctx.moveTo(0, 0);
                        _ctx.lineTo(125, 0);
                        for(let i = 0; i < 10; i++)
                        {
                            let y = i * 30;
                            _ctx.lineTo(105, y + 10);
                            _ctx.lineTo(145, y + 20);
                        }
                        _ctx.lineTo(0, h);
                        _ctx.stroke();
                        _ctx.clip();
                        _ctx.closePath();

                        this.DrawQV(_ctx, _dt, h);
                    _ctx.restore();

                    // right
                    _ctx.save();
                        _ctx.beginPath();
                        _ctx.translate(pos2.x, pos2.y);
                        //_ctx.rotate(Math.PI / 36);
                        _ctx.moveTo(250, 0);
                        _ctx.lineTo(125, 0);
                        for(let i = 0; i < 10; i++)
                        {
                            let y = i * 30;
                            _ctx.lineTo(105, y + 10);
                            _ctx.lineTo(145, y + 20);
                        }
                        _ctx.lineTo(250, h);
                        _ctx.stroke();
                        _ctx.clip();
                        _ctx.closePath();

                        this.DrawQV(_ctx, _dt, h);
                    _ctx.restore();
                    
                    if(this.animationTime < .3)
                    {
                        res.sheets.duck.Draw(_ctx, 'arm_more', 1, -25, 0);
                        res.sheets.duck.Draw(_ctx, 'arm_more', 2, -25, 0);
                    }
                }
        
            _ctx.restore();
        }
    }

    DrawQV(_ctx, _dt, h)
    {
        _ctx.lineWidth = 6;
        _ctx.strokeStyle = '#000';
        _ctx.fillStyle = '#fff';

        _ctx.save();
            _ctx.beginPath();
            Utils.RoundedRect(_ctx, 0, 0, 250, h, 6);
            _ctx.fill();
            _ctx.clip();

            _ctx.fillStyle = '#edeef0';
            _ctx.fillRect(0, 0, 250, 45);

            _ctx.font = '24px Pangolin';
            _ctx.fillStyle = '#000';
            _ctx.textAlign = 'center';
            _ctx.textBaseline = 'top';

            // заголовок
            let txt = loc.Get('hud', 'qv');
            let w = _ctx.measureText(txt).width;
            _ctx.drawImage(res.sprites.ducky, (250 - w) / 2 - 12 - 6, 10);
            _ctx.fillText(txt, 250 / 2 + 16, 8 + 4);

            // мульт
            if(this.enemy.signed == 2)
                res.sheets.promo2.Draw(_ctx, 'promo2', Utils.GetAnimationFrame(_dt, 200, res.sheets.promo2.GetTagFrames('idle')), 0, 45);
            else
                res.sheets.promo1.Draw(_ctx, 'promo1', Utils.GetAnimationFrame(_dt, 200, res.sheets.promo1.GetTagFrames('idle')), 0, 45);

            // цена
            _ctx.fillStyle = '#edeef0';
            _ctx.fillRect(0, h - 80, 250, 80);
            if(this.enemy.resetCounter > 0 || this.enemy.signed >= 2)
            {
                _ctx.fillStyle = '#000';
                _ctx.font = '36px Pangolin';
                
                txt = this.enemy.signed == 2 ? '1' : this.enemy.signed == 3 ? '2' : '324905';
                w = _ctx.measureText(txt).width;
                _ctx.textBaseline = 'bottom';

                _ctx.drawImage(res.sprites.minipencil, 250 / 2 + w / 2 + 5 - 12, h - 70);
                _ctx.fillText(txt, 250 / 2 - 16, h - 35);

                _ctx.textAlign = 'left';
                _ctx.font = '24px Pangolin';

                txt = loc.Get('hud', 'before_reset');
                w = _ctx.measureText(txt).width + 40;
                _ctx.fillText(txt, 40, h - 10);
                
                if(this.enemy.signed >= 2)
                    txt = ` 2 ${loc.Get('hud', 'h')}`;
                else
                    txt = ` ${this.enemy.resetCounter} ${loc.Get('hud', 'm')}`;
                
                    _ctx.fillStyle = TEXT_COLORS[2];
                _ctx.fillText(txt, w, h - 10);
                w += _ctx.measureText(txt).width;
            }

            _ctx.stroke();
            _ctx.closePath();
        _ctx.restore();

        // вандализм
        if(this.enemy.signed < 2)
            _ctx.drawImage(this.vandalismCanvas, -55, -25);

        _ctx.font = '24px Pangolin';
        _ctx.textAlign = 'left';
        _ctx.textBaseline = 'bottom';
        _ctx.fillStyle = TEXT_COLORS[2];
        // дельты
        for(let i in this.deltas)
        {
            let t = (this.deltaTime - this.deltas[i].timer - this.deltaStickTime) / (this.deltaTime - this.deltaStickTime);
            t = Utils.Clamp(t, 0, 1);
            
            _ctx.globalAlpha = 1 - t;
            _ctx.fillText(`-${this.deltas[i].delta}`, w + 5, h - 10 - t * 25);
            _ctx.globalAlpha = 1;
        }

        if(this.enemy.resetCounter == 0 && this.enemy.signed < 2)
        {
            _ctx.fillStyle = '#000';
            _ctx.beginPath();
            Utils.RoundedRect(_ctx, 0, h - 80, 250, 80, 6);
            _ctx.fill();
            _ctx.closePath();

            _ctx.fillStyle = '#fff';
            _ctx.font = '46px Pangolin';
            _ctx.textAlign = 'center';
            _ctx.textBaseline = 'middle';
            _ctx.fillText(loc.Get('hud', 'free'), 250 / 2, h - 70 / 2);
        }
    }
}

class PromoDuck extends Enemy
{
    constructor()
    {
        super();

        this.code = 'duck';
        this.name = loc.Get('enemies', 'duck');
        this.index = {x: 0, y: 0};

        this.maxHP = 500;

        this.attacks = [CardAttack, ThrowAttack, MouthAttack, BallAttack, HandsAttack];
        
        this.actions = [
            {name: loc.Get('actions', 'check'), index: {x: 0, y: 0}, action: this.Check.bind(this)},
            {name: loc.Get('actions', 'bet'), index: {x: 1, y: 0}, action: this.Bet.bind(this)},
            {name: loc.Get('actions', 'vandalism'), index: {x: 0, y: 1}, action: this.Vandalize.bind(this)},
        ];
        this.normalActions = [
            ...this.actions
        ]
        this.shieldedActions = [
            this.actions[0],
            this.actions[1]
        ];
        this.shieldDealActions = [
            this.actions[0],
            {name: loc.Get('actions', 'wait'), index: {x: 1, y: 1}, action: this.Wait.bind(this), highlighted: true},
            this.actions[2],
        ]
        this.endingActions = [
            this.actions[0]
        ];
        this.noActions = [
            this.actions[0]
        ];
        this.killedActions = 
        [

        ]
        
        this.flavourText = this.Dial('idle');
        this.dangerFlavourText = this.Dial('idle2');
    }

    CreateSprite(_x, _y)
    {
        this.sprite = new PromoDuckSprite(_x, _y, this);
        return this.sprite;
    }

    Start()
    {
        super.Start();

        this.resetCounter = 45;
        this.resetTalk = 0;

        this.dealt = 0;
        this.dealNo = 0;
        this.dealBroke = 0;
        this.dealDunno = 0;
        this.signed = 0;
        this.dumbBaby = false;

        this.story = 0;

        this.check = 0;

        this.bet = 0;

        this.hurt = 0;
        this.actualHurt = 0;
        this.mockery = 0;
        this.failedAttack = 0;
        this.mockAnnoyed = false;

        this.drawAttempt = 0;
        this.popsicle = 0;
        this.popsicleHP = 0;

        this.weakened = 0;
        this.justWeakened = false;
        this.call = 0;
        this.shielding = 0;
        this.shieldDeal = 0;

        this.drawn = 0;
        this.wtf = 0;
        this.dontEvenThink = 0;

        /*this.hp = 10;
        this.resetCounter = 15;
        this.weakened = 2;
        this.call = 3;
        this.shielding = 1;

        this.resetCounter = 0;*/
    }

    GetAttack()
    {
        if(this.resetCounter <= 0 && this.signed == 1)
            return {
                attackClass: ByeAttack,
                difficulty: 1
            };

        if(this.weakened >= 4 || this.shieldDeal == 1)
            return {
                attackClass: TrueNothingAttack,
                difficulty: 1
            };

        if(this.signed >= 2)
            return {
                attackClass: NothingAttack,
                difficulty: 1
            };

        if(this.drawAttempt == 2)
            return {
                attackClass: ScribbleAttack,
                difficulty: 1
            };

        if(this.resetCounter <= 0 && this.signed == 0)
            return {
                attackClass: NothingAttack,
                difficulty: 1
            };

        if(this.popsicle == 1)
            return {
                attackClass: PopsicleAttack,
                difficulty: 1
            };

        let attackClass = this.attacks[this.attackCounter % this.attacks.length];
        let attackData = {attackClass, difficulty: 1};

        if(this.attackCounter >= this.attacks.length)
            attackData.difficulty = 2;

        if(this.attackCounter >= this.attacks.length * 2)
            attackData.attackClass = Utils.RandomArray(this.attacks);
        
        this.attackCounter++;

        return attackData;
    }

    Idle()
    {
        if(this.signed == 3)
            return {
                text: this.Dial('idle_signed_alt')
            };

        if(this.signed == 2)
            return {
                text: this.Dial('idle_signed')
            };

        if(this.weakened >= 4)
            return {
                text: this.Dial('idle_geno3')
            };

        if(this.resetCounter <= 0)
            return {
                text: this.Dial('idle_free')
            };

        if(this.shieldDeal == 1)
            return {
                text: this.Dial('idle_shield_deal')
            };

        if(this.weakened == 2)
            return {
                text: this.Dial('idle_weakened')
            };

        if(this.failedAttack == 2)
            return {
                text: this.Dial('idle_tutorial')
            };

        if(this.call == 1)
        {
            return {
                text: this.Dial('idle_geno')
            }
        }
        if(this.call == 3)
        {
            return {
                text: this.Dial('idle_geno2')
            }
        }

        if(this.weakened == 0 && this.call == 0)
            return {
                text: [Utils.RandomArray(this.flavourText)]
            };
        else
            return {
                text: [Utils.RandomArray(this.dangerFlavourText)]
            };
    }

    DealDamage(_damage)
    {
        let damage = _damage;
        
        if(damage > 0)
        {
            if(damage > this.hp && this.shielding == 0)
            {
                damage = this.hp - 2;
            }
            else if(this.shielding == 1)
                damage = 1;
            else if(this.shielding == 2 || this.shielding == -1)
            {
                if(this.shielding == 2)
                    this.weakened = 5;

                damage = this.hp;
            }
        }

        return super.DealDamage(damage);
    }

    Hurt(_damage)
    {
        this.hurt++;

        if(this.justWeakened)
            this.justWeakened = false;

        if(this.shielding == 1 && _damage > 0)
        {
            this.actions = [...this.noActions];

            this.shieldDeal = 2;

            return {
                speech: this.Dial('geno_break'),
                actions: [
                    () => new BreakAction(this),
                ]
            };
        }

        if(this.weakened == 5 || this.shielding == -1)
        {
            this.actions = [...this.killedActions];

            if(this.shielding == -1)
            {
                this.weakened = 5;
                
                battle.theme.Swap({r: 0, g: 0, b: 0}, {r: 170, g: 170, b: 170}, true);
                res.sfx.bgm.pause();
                res.sfx.bgmGeno.pause();
            }

            let speech = ['&0'];

            if(this.shielding == -1)
                speech = this.Dial('shield_betrayal');

            return {
                speech,
                actions: [
                    () => new DeathAction(this),
                ]
            };
        }

        if(_damage > 0)
        {
            this.DecreaseResetCounter(1);
        }

        if(this.hp / this.maxHP <= .6 && this.weakened == 0)
        {
            this.weakened = 1;
            this.justWeakened = true;
            
            let message = {
                speech: this.Dial('weakened'),
            }

            if(this.resetCounter <= 0)
            {
                this.resetTalk = 1;
                message.speech = this.Dial('weakened_alt');
            }

            res.sfx.bgm.pause();
            res.sfx.bgmGeno.play();
            
            this.bet = 3;
            return message;
        }

        if(_damage > 0)
        {
            this.actualHurt++;
            
            if(this.weakened == 0 && this.call == 0 && this.mockery >= 2 && this.actualHurt == 1)
            {
                return {
                    speech: this.Dial('attack_finally')
                };
            }
            
            if(this.drawAttempt == 0 && this.weakened == 0 && this.call == 0)
            {
                this.drawAttempt = 1;
    
                return {
                    speech: this.Dial('attack_scribble'),
                    actions: [
                        () => new DrawAction(this)
                    ]
                };
            }
        }
        else if(this.weakened == 0 && this.call == 0)
        {
            this.mockery++;

            if(this.actualHurt == 0)
                this.failedAttack = 1;

            if(this.actualHurt >= 2 && this.mockery >= 3)
            {
                if(this.mockAnnoyed)
                    return {
                        speech: this.StoryFlow()
                    };

                this.mockAnnoyed = true;
                return {
                    speech: this.Dial('annoyed')
                };
            }

            switch(this.mockery)
            {
                case 1:
                    return {
                        speech: this.Dial('mockery1')
                    };

                case 2:
                    return {
                        speech: this.Dial('mockery2')
                    };

                case 3:
                    return {
                        speech: this.Dial('mockery3')
                    };

                case 4:
                    return {
                        speech: this.Dial('mockery4')
                    };

                case 5:
                    return {
                        speech: this.Dial('mockery5')
                    };
            }
        }

        return {
            speech: this.StoryFlow()
        };
    }

    Deal(_yes, _no, _len, _pointsOutside)
    {
        this.dealt++;

        let text = this.Dial('deal_pre');
        if(_yes && _no || (_len > 30 && _pointsOutside / _len > .7))
        {
            this.dealBroke++;

            let answer = [];
            switch(this.dealBroke)
            {
                case 1:
                    answer = this.Dial('deal_broke_1');
                    break;

                case 2:
                    answer = this.Dial('deal_broke_2');
                    break;

                default:
                    answer = this.Dial('deal_broke_3');
                    break;
            }
            text = text.concat(answer);
        }
        else if(!_yes && !_no)
        {
            this.dealDunno++;

            let answer = [];
            switch(this.dealDunno)
            {
                case 1:
                    answer = this.Dial('deal_dunno_1');
                    break;

                case 2:
                    answer = this.Dial('deal_dunno_2');
                    break;

                default:
                    answer = this.Dial('deal_dunno_3');
                    break;
            }
            text = text.concat(answer);
        }
        else
        {
            if(_no)
            {
                this.dealNo++;
                let answer = [];

                switch(this.dealNo)
                {
                    case 1:
                        answer = this.Dial('deal_no_1');
                        break;

                    case 2:
                        answer = this.Dial('deal_no_2');
                        break;

                    default:
                        answer = this.Dial('deal_no_3');
                        break;
                }

                text = text.concat(answer);
            }
            else if(_yes)
            {
                text = text.concat(this.Dial('deal_signed'));
                this.signed = 1;
            }
        }

        if(this.dealNo + this.dealBroke + this.dealDunno >= 3 && !this.dumbBaby)
        {
            this.dumbBaby = true;
        }

        return {speech: text};
    }
    
    Drawn(_len)
    {
        this.drawn++;
        
        let result = {text: this.Dial('vandalism_fail')};
        let delta = 0;
        
        if(_len >= 100)
        {
            delta = 5;
            result.text = this.Dial('vandalism_success_4');
        }
        else if(_len >= 50)
        {
            delta = 3;
            result.text = this.Dial('vandalism_success_3');
        }
        else if(_len >= 25)
        {
            delta = 2;
            result.text = this.Dial('vandalism_success_2');
        }
        else if(_len >= 5)
        {
            delta = 1;
            result.text = this.Dial('vandalism_success_1');
        }

        this.DecreaseResetCounter(delta);

        if(delta == 0)
        {
            if(this.dontEvenThink == 0 && this.wtf < 3)
            {
                this.dontEvenThink = 1;
                result.speech = this.Dial('vandalism_fail_speech');
            }
            else
                result.speech = this.StoryFlow();
        }
        if(delta > 0)
        {
            this.wtf++;
            
            let speech = this.StoryFlow();
            result.speech = speech;
        }

        return result;
    }

    StoryFlow()
    {
        let result = null;

        if(this.signed > 0 || this.weakened >= 4)
        {
            return null;
        }

        if(this.resetCounter <= 0)
        {
            this.resetTalk++;
            
            if(this.resetTalk == 1 && this.dealt > 0)
                this.resetTalk = 2;

            switch(this.resetTalk)
            {
                case 1:
                    return this.Dial('reset_1');

                case 2:
                    return this.Dial('reset_2');

                case 3:
                    return this.Dial('reset_3');

                case 4:
                    return this.Dial('reset_4');

                case 10:
                    return this.Dial('reset_6');

                default:
                    return this.Dial('reset_5');
            }
        }

        if(this.wtf < 1)
            return result;

        if(this.shielding != 0)
        {
            return null;
        }

        this.story++;
        switch(this.story)
        {
            case 1:
                return this.Dial('story_1');

            case 2:
                return this.Dial('story_2');

            case 3:
                return this.Dial('story_3');

            case 4:
                return this.Dial('story_4');

            case 5: 
                return this.Dial('story_5');

            case 6:
                return this.Dial('story_6');
            
            case 7: 
                return this.Dial('story_7');

            case 8:
                if(this.weakened > 0)
                    return this.Dial('story_8_alt');
                break;
        }

        if(this.popsicle == 0 && this.weakened == 0 && this.call == 0)
        {
            this.popsicle = 1;
            this.popsicleHP = battle.hp;
            return this.Dial('story_8');
        }

        return null;
    }

    DecreaseResetCounter(_delta)
    {
        if(this.shielding >= 2)
            return;

        this.resetCounter -= _delta;
        if(this.resetCounter <= 0)
        {
            _delta += this.resetCounter;
            this.resetCounter = 0;
            
            if(!this.signed)
            {
                this.actions = [...this.normalActions];

                if(this.shielding == 1)
                    this.actions = [this.actions[0], this.actions[1]];

                if(this.dealt == 0 && this.actions[1] != null)
                    this.actions[1].highlighted = true;
            }
        }
        
        if(_delta > 0)
            this.sprite.AddDelta(_delta);
    }

    AttackEnd()
    {
        this.DecreaseResetCounter(1);
        
        if(this.failedAttack == 1)
            this.failedAttack = 2;
        else if(this.failedAttack == 2)
            this.failedAttack = 0;

        if(this.signed == 1)
        {
            this.signed = 2;
            this.weakened = 0;

            this.actions = [...this.endingActions];

            if(this.call != 0)
                return {
                    speech: this.Dial('deal_signed_2_alt'),
                    actions: [
                        () => new RebetAction(this),
                    ]
                };
            
            return {
                speech: this.Dial('deal_signed_2'),
                actions: [
                    () => new RebetAction(this),
                ]
            };
        }

        if(this.drawAttempt == 2)
        {
            this.drawAttempt = 3;

            return {
                speech: this.Dial('attack_scribble_2'),
            };
        }

        if(this.popsicle == 1)
        {
            this.popsicle = 2;

            if(battle.hp < this.popsicleHP)
            {
                return {
                    speech: this.Dial('attack_popsicle_fail'),
                };
            }

            return {
                speech: this.Dial('attack_popsicle_success')
            };
        }

        if(this.weakened == 1)
            this.weakened = 2;
        else if(this.weakened == 2)
            this.weakened = 3;

        if(!this.justWeakened)
        {
            if(this.hp / this.maxHP <= .5 && this.call < 1)
            {
                this.call = 1;

                return {
                    speech: this.Dial('geno_phone'),
                };
            }
            else if(this.hp / this.maxHP <= .2 && this.call < 3)
            {
                this.call = 3;

                this.actions = [...this.shieldedActions];
                if(this.dealt == 0 && this.actions[1] != null)
                    this.actions[1].highlighted = true;

                return {
                    speech: this.Dial('geno_phone_2'),
                    actions: [
                        () => new ShieldAction(this)
                    ]
                };
            }
            else if(this.call == 1)
            {
                this.call = 2;
            }
        }
        
        return {};
    }

    Check()
    {
        this.check++;

        if(this.weakened >= 4)
        {
            return {
                text: this.Dial('check_geno')
            }
        }

        let result = {
            text: this.Dial('check'),
            speech: this.Dial('check_speech')
        };

        if(this.check > 1)
        {
            delete result.speech;
            result.text = this.Dial('check_2');
            result.speech = this.StoryFlow();
        }

        return result;
    }

    Wait()
    {
        this.shieldDeal = -1;
        this.actions = [...this.normalActions];
        
        res.sfx.bgmGeno.pause();
        battle.Blank(true);

        return {
            text: this.Dial('shield_deal_wait'),
            speech: this.Dial('shield_deal_wait_speech'),
            actions: [
                () => new WaitEndAction(this),
            ]
        };
    }
    Bet()
    {
        this.bet++;

        if(this.shielding == 1 && this.shieldDeal == 0 && this.resetCounter > 0)
        {
            this.shieldDeal = 1;

            this.actions = [...this.shieldDealActions];

            return {
                text: this.Dial('shield_deal'),
                speech: this.Dial('shield_deal_speech'),
                actions: [
                    () => new UnshieldAction(this),
                ]
            };
        }

        if(this.resetCounter <= 0)
        {
            if(this.shielding == 1)
            {
                return {
                    text: this.Dial('shield_deal_alt'),
                    speech: this.Dial(this.resetTalk > 0 ? 'shield_deal_alt2_speech' : 'shield_deal_alt_speech'),
                    mode: DEAL,
                    actions: [
                        () => new UnshieldAction(this),
                    ]
                };
            }

            let result = {
                text: this.Dial('bet_draw'),
                mode: DEAL
            };
            if(this.dumbBaby)
            {
                result.speech = this.Dial('bet_dumb');
            }
            return result;
        }

        switch(this.bet)
        {
            case 1:
                return {
                    text: this.Dial('bet_early'),
                    speech: this.Dial('bet_early_speech'),
                };
                
            case 2:
                return {
                    text: this.Dial('bet_early_2'),
                    speech: this.Dial('bet_early_2_speech')
                };

            default:
                return {
                    text: this.Dial('bet_early_3'),
                    speech: this.StoryFlow(),
                };
        }
    }
    Vandalize()
    {
        return {
            text: this.Dial('vandalism'),
            mode: DRAW
        }
    }
    Nothing()
    {
        return {
            text: [''],
            speech: this.StoryFlow(),
        };
    }
}

class TriggerAction
{
    constructor(_parent)
    {
        this.parent = _parent;
        this.finished = false;
    }

    Start()
    {

    }
    Render(_ctx, _dt)
    {

    }
    GameLoop(_delta)
    {

    }
    PointerUp(e)
    {

    }
    Finish()
    {
        this.parent = null;
        this.finished = true;
    }
}

class DrawAction extends TriggerAction
{
    constructor(_parent)
    {
        super(_parent);
        
        this.animationTime = 200;
        this.animationTimer = this.animationTime;
    }

    Start()
    {
        this.soundPlayed = false;
        this.parent.sprite.SetAnimation(STATE_DRAW, 0);
    }
    GameLoop(_delta)
    {
        this.animationTimer -= 1 * _delta;

        let t = 1 - this.animationTimer / this.animationTime;
        this.parent.sprite.SetAnimation(STATE_DRAW, t);

        if(t >= .3 && !this.soundPlayed)
        {
            this.soundPlayed = true;
            res.sfx.scribble1.play();
        }
        
        if(this.animationTimer <= 0)
            this.Finish();
    }

    Finish()
    {
        this.parent.sprite.SetAnimation(STATE_DRAW, 1);
        this.parent.drawAttempt = 2;

        super.Finish();
    }
}

class StakeAction extends TriggerAction
{
    constructor(_parent)
    {
        super(_parent);
        
        this.animationTime = 50;
        this.animationTimer = this.animationTime;
    }

    Start()
    {
        this.parent.sprite.stakeShown = true;
        this.animationTimer = this.animationTime;
        this.parent.sprite.SetAnimation(STATE_HANGING, 0);
    }
    GameLoop(_delta)
    {
        this.animationTimer -= 1 * _delta;
        this.parent.sprite.SetAnimation(STATE_HANGING, 1 - this.animationTimer / this.animationTime);
        
        if(this.animationTimer <= 0)
        {
            this.Finish();
        }
    }

    Finish()
    {
        this.parent.sprite.SetAnimation(STATE_NORMAL, 0);
        
        super.Finish();
    }
}

class ShieldAction extends TriggerAction
{
    constructor(_parent)
    {
        super(_parent);
        
        this.animationTime = 400;
        this.animationTimer = this.animationTime;
    }

    Start()
    {
        this.parent.sprite.stakeShown = true;
        this.animationTimer = this.animationTime;
        this.parent.sprite.SetAnimation(STATE_SHIELDING, 0);
    }
    GameLoop(_delta)
    {
        this.animationTimer -= 1 * _delta;
        this.parent.sprite.SetAnimation(STATE_SHIELDING, 1 - this.animationTimer / this.animationTime);
        
        if(this.animationTimer <= 0)
        {
            this.Finish();
        }
    }

    Finish()
    {
        this.parent.sprite.SetAnimation(STATE_NORMAL, 0);
        
        this.parent.shielding = 1;

        super.Finish();
    }
}
class UnshieldAction extends TriggerAction
{
    constructor(_parent)
    {
        super(_parent);
        
        this.animationTime = 200;
        this.animationTimer = this.animationTime;
    }

    Start()
    {
        this.parent.sprite.stakeShown = true;
        this.animationTimer = this.animationTime;
        this.parent.sprite.SetAnimation(STATE_UNSHIELDING, 1);
    }
    GameLoop(_delta)
    {
        this.animationTimer -= 1 * _delta;
        this.parent.sprite.SetAnimation(STATE_UNSHIELDING, this.animationTimer / this.animationTime);
        
        if(this.animationTimer <= 0)
        {
            this.Finish();
        }
    }

    Finish()
    {
        this.parent.sprite.SetAnimation(STATE_NORMAL, 0);
        
        this.parent.shielding = -1;
        this.parent.sprite.stakeShield = 0;

        super.Finish();
    }
}
class BreakAction extends TriggerAction
{
    constructor(_parent)
    {
        super(_parent);
        
        this.animationTime = 100;
        this.animationTimer = this.animationTime;

        this.broke = false;
    }

    Start()
    {
        this.animationTimer = this.animationTime;
        this.parent.sprite.SetAnimation(STATE_BREAK, 0);
    }
    GameLoop(_delta)
    {
        this.animationTimer -= 1 * _delta;

        let t = 1 - this.animationTimer / this.animationTime;
        this.parent.sprite.SetAnimation(STATE_BREAK, t);

        if(t >= .3 && !this.broke)
        {
            this.broke = true;

            battle.theme.Swap({r: 0, g: 0, b: 0}, {r: 170, g: 170, b: 170}, true);
            this.parent.weakened = 4;

            res.sfx.explosion.play();
            res.sfx.bgm.pause();
            res.sfx.bgmGeno.pause();
        }
        
        if(this.animationTimer <= 0)
        {
            this.Finish();
        }
    }

    Finish()
    {
        this.parent.sprite.SetAnimation(STATE_NORMAL, 0);
        
        this.parent.shielding = 2;

        super.Finish();
    }
}

class DeathAction extends TriggerAction
{
    constructor(_parent)
    {
        super(_parent);
        
        this.animationTime = 200;
        this.animationTimer = this.animationTime;
    }

    Start()
    {
        this.animationTimer = this.animationTime;
        this.parent.sprite.SetAnimation(STATE_DEAD, 0);
    }
    GameLoop(_delta)
    {
        this.animationTimer -= 1 * _delta;

        let t = 1 - this.animationTimer / this.animationTime;
        this.parent.sprite.SetAnimation(STATE_DEAD, t);

        if(this.animationTimer <= 0)
        {
            this.Finish();
        }
    }

    Finish()
    {
        super.Finish();
    }
}
class WaitEndAction extends TriggerAction
{
    constructor(_parent)
    {
        super(_parent);
    }

    Start()
    {
        this.Finish();
    }

    Finish()
    {
        this.parent.DecreaseResetCounter(this.parent.resetCounter);

        this.parent.weakened = -1;
        this.parent.shielding = -1;
        this.parent.resetTalk = 1;
        this.parent.sprite.stakeShield = 0;

        res.sfx.bgm.play();
        battle.Blank();
        
        super.Finish();
    }
}

class RebetAction extends TriggerAction
{
    constructor(_parent)
    {
        super(_parent);

        this.speechBubble = new SpeechBubble(null, res.sfx.other, true);
    }

    Start()
    {
        this.speechBubble.Start();
        this.speechBubble.textBounds.x1 = 1280 - 250;
        this.speechBubble.textBounds.x2 = 1280 - 50;
        this.speechBubble.textBounds.y1 = battle.defaultBounds.y1 - 200;

        this.speechBubble.SetText(loc.Dial('duck', 'deal_signed_2_other'));
    }
    GameLoop(_delta)
    {
        this.speechBubble.GameLoop(_delta);

        if(this.speechBubble.finished)
            this.Finish();
    }
    PointerUp(e)
    {
        this.speechBubble.PointerUp(e);
    }

    Render(_ctx, _dt)
    {
        this.speechBubble.Render(_ctx, _dt);
    }

    Finish()
    {
        this.parent.signed = 3;
        super.Finish();
    }
}