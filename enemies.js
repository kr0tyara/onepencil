/*
    ~ - новый абзац
    % - задержка текста
    &n - триггер actions 
    @n - цвет
    ^ - тряска
    #n - лицо
*/

class Enemy
{
    constructor()
    {
        this.name = 'Никто';
        this.index = {x: 0, y: 0};
        this.sprite = null;

        this.hp = 0;
        this.maxHP = 5;

        this.alive = true;
        this.attacks = [TestAttack];

        this.actions = [
            {name: 'Проверка', index: {x: 0, y: 0}, action: this.Check.bind(this)},
        ];
    }

    Start()
    {
        this.alive = true;
        this.hp = this.maxHP;

        if(this.sprite)
            this.sprite.Start();
    }

    CreateSprite(_x, _y)
    {
        this.sprite = new EnemySprite(_x, _y, 200, 300, this);
        return this.sprite;
    }

    GetAttack(_counter)
    {
        return {
            attackClass: this.attacks[_counter % this.attacks.length],
            difficulty: 1
        }
    }

    Die()
    {
        this.alive = false;
        this.sprite.SetAnimation(STATE_DEAD, 0);
    }

    Idle()
    {
        return {
            text: ['~Где я?']
        }
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
            text: ['~Никто - АТК 1000 ЗЩТ -999.~Я ем любовь.'],
            speech: ['Мяу'],
        };
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

        this.expression = 0;

        this.speaking = false;
        this.speechBubble = new SpeechBubble(this, res.sfx.duck);

        this.alphaTime = 10;
        this.alphaTimer = 0;
        this.alphaBack = true;
    }

    Start()
    {
        this.speechBubble.Start();
    }

    SetAnimation(_state, _time)
    {
        let oldState = this.state;

        this.state = _state;
        this.animationTime = _time;

        if(this.state == STATE_ATTACKING)
        {
            this.alphaBack = false;
            this.alphaTimer = this.alphaTime;
        }
        else if(oldState == STATE_ATTACKING)
            this.alphaBack = true;
    }
    SetExpression(_index)
    {
        this.expression = _index;
    }
    ResetExpression()
    {
        this.expression = 0;
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

        if(this.alphaTimer > 0)
        {
            this.alphaTimer -= 1 * _delta;
            if(this.alphaTimer < 0)
                this.alphaTimer = 0;
        }
    }

    Render(_ctx, _dt)
    {
        this.Draw(_ctx, _dt);

        if(this.state == STATE_DEAD)
            _ctx.globalAlpha = .05;
        else if(this.alphaTimer >= 0)
        {
            if(this.alphaBack)
                _ctx.globalAlpha = 1 - (this.alphaTime - this.alphaTimer) / this.alphaTime;
            else
                _ctx.globalAlpha = .5 * (this.alphaTime - this.alphaTimer) / this.alphaTime;
        }
        else
            _ctx.globalAlpha = 0;

        _ctx.fillStyle = '#fff';
        _ctx.fillRect(this.x, this.y, this.w, this.h);

        _ctx.globalAlpha = 1;
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
        this.drawnLines = [];
    }

    AddDrawing(_line)
    {
        this.drawnLines.push(_line);
    }

    ResetExpression()
    {
        if(this.enemy.drawAttempt == 2)
            this.expression = 3;
        else
            super.ResetExpression();
    }

    Draw(_ctx, _dt)
    {
        // todo: он не должен прыгать во время вандализма
        this.y = battle.bounds.y1 - this.h;
        if(this.y < 0)
            this.y = 0;

        // промотка
        if(this.stakeShown)
        {
            let x = battle.defaultBounds.x1;
            let y = 25;
            let h = battle.defaultBounds.y1 - 25 - 25;
            
            if(this.state == STATE_HANGING)
                y = -h + (h + 25) * this.animationTime;

            _ctx.lineCap = _ctx.lineJoin = 'round';
            
            _ctx.lineWidth = 3;
            _ctx.strokeStyle = '#000';
            _ctx.fillStyle = '#fff';

            _ctx.beginPath();
            Utils.RoundedRect(_ctx, x, y, 250, h, 6);
            _ctx.fill();
            _ctx.stroke();
            _ctx.closePath();
            
            _ctx.drawImage(res.sprites.promote, 0, _dt % 500 < 250 ? 0 : 162, 244, 162, x, y, 244, 162);

            _ctx.font = '48px Pangolin';
            _ctx.fillStyle = '#000';
    
            let text = `324905`;
            let w = _ctx.measureText(text).width;

            _ctx.textAlign = 'center';
            _ctx.textBaseline = 'bottom';

            _ctx.save();
            _ctx.translate(x + 250 / 2, y + h - 30);

            _ctx.fillText(text, 0, 0);
            _ctx.translate(w / 2 + 5, -16);
            _ctx.rotate(Math.PI * 1.5);
            _ctx.drawImage(res.sprites.soul, 0, 0);

            _ctx.restore();
            
            _ctx.font = '24px Pangolin';
            _ctx.fillText(`До сброса: ${this.enemy.resetCounter} м.`, x + 250 / 2, y + h - 10);
            
            // вандализм
            for(let j in this.drawnLines)
            {
                _ctx.lineWidth = this.drawnLines[j].width;
                _ctx.strokeStyle = this.drawnLines[j].color;
                _ctx.beginPath();

                for(let i in this.drawnLines[j].points)
                    _ctx.lineTo(this.drawnLines[j].points[i].x, this.drawnLines[j].points[i].y);

                _ctx.stroke();
                _ctx.closePath();
            }

            // в режиме атаки
            if(this.alphaTimer >= 0)
            {
                if(this.alphaBack)
                    _ctx.globalAlpha = 1 - (this.alphaTime - this.alphaTimer) / this.alphaTime;
                else
                    _ctx.globalAlpha = .5 * (this.alphaTime - this.alphaTimer) / this.alphaTime;
            }
            else
                _ctx.globalAlpha = 0;
    
            _ctx.fillStyle = '#fff';
            _ctx.fillRect(x - 55, 0, 360, y + h + 20);
    
            _ctx.globalAlpha = 1;
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

        if(this.state == STATE_HURT)
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
        else
        {
            let expression = this.expression;
            if(harmed && this.expression == 0)
                expression = 5;

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
                case 0:
                case 4:
                    if(mouthOpen)
                        hairOffset.y = -3;
                    break;

                case 2:
                    headWobble.x = 0;
                    headWobble.y = 0;
                    break;
            }

            res.sheets.duck.Draw(_ctx, 'shadow', 0, this.x, this.y);
            res.sheets.duck.Draw(_ctx, 'arm_back', harmed ? 2 : this.expression == 4 ? 1 : 0, this.x + armWobble.x, this.y + armWobble.y);
            res.sheets.duck.Draw(_ctx, 'feet', harmed ? 2 : 0, this.x, this.y);

            if(this.expression != 2)
                res.sheets.duck.Draw(_ctx, 'hair', harmed ? 1 : 0, this.x + hairOffset.x + headWobble.x, this.y + hairOffset.y + headWobble.y);

            res.sheets.duck.Draw(_ctx, 'body', harmed ? 2 : 0, this.x + bodyWobble.x, this.y + bodyWobble.y);

            if(this.expression != 6)
                res.sheets.duck.Draw(_ctx, 'arm_front', harmed ? 2 : 0, this.x + armWobble.x, this.y + armWobble.y);

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
    }
}

class PromoDuck extends Enemy
{
    constructor()
    {
        super();

        this.name = 'ПромоУтка';
        this.index = {x: 0, y: 0};

        this.maxHP = 500;
        this.resetCounter = 30;

        this.attacks = [CardAttack, ThrowAttack, MouthAttack, BallAttack];
        
        this.actions = [
            {name: 'Проверка', index: {x: 0, y: 0}, action: this.Check.bind(this)},
            {name: 'Ставка', index: {x: 0, y: 1}, action: this.Bet.bind(this)},
            {name: 'Вандализм', index: {x: 1, y: 1}, action: this.Vandalize.bind(this)},
        ];
        
        this.flavourText = [
            '~ПромоУтка чистит пёрышки.%~Залысину видно за километр.',
            '~9 из 36 538 Тунеров рекомендуют!',
            '~Пахнет грифелем.',
            '~ПромоУтка считает свою прибыль.%~Для этого не нужен калькулятор.',
            '~ПромоУтка ковыряется в зубах.~Но, скорее, просто грызёт зубочистку...',
        ];
        this.dangerFlavourText = [
            '~ПромоУтка нервно глядит по сторонам.',
            '~С ПромоУтки слетают перья.',
            '~ПромоУтка... молится???%%%~...послышалось.',
            '~Пахнет мокрыми наггетсами и опилками.',
            '~ПромоУтка отменяет все встречи.%~Даже на следующий год.',
        ];
    }

    CreateSprite(_x, _y)
    {
        this.sprite = new PromoDuckSprite(_x, _y, this);
        return this.sprite;
    }

    Start()
    {
        super.Start();

        this.check = 0;

        this.bet = 0;
        this.betShown = false;

        this.hurt = 0;
        this.actualHurt = 0;
        this.mockery = 0;
        this.failedAttack = 0;
        this.mockAnnoyed = false;

        this.drawAttempt = 0;

        this.weakened = 0;
        this.call = 0;

        this.drawn = 0;
    }

    GetAttack(_counter)
    {
        if(this.drawAttempt == 2)
            return {
                attackClass: ScribbleAttack,
                difficulty: 1
            };

        let attackData = super.GetAttack(_counter);

        if(_counter >= 4)
            attackData.difficulty = 2;

        if(_counter >= 8)
            attackData.attackClass = Utils.RandomArray(this.attacks);

        return attackData;
    }

    Idle()
    {
        if(this.weakened == 2)
            return {
                text: ['~(На твоём месте я бы прислушался к Промоутке.)']
            };

        if(this.failedAttack == 2)
            return {
                text: ['~(Перерисуй заклинание по шаблону, не отпуская карандаш, чтобы атаковать!)']
            };

        if(this.call == 1)
        {
            return {
                text: ['~ПромоУтка вызвал подкрепление.']
            }
        }
        else if(this.call == 3)
        {
            return {
                text: ['~Подкрепление задерживается.']
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

    Hurt(_damage)
    {
        this.hurt++;

        if(_damage > 5)
        {
            this.DecreaseResetCounter(1);
        }

        if(this.hp / this.maxHP <= .6 && this.weakened == 0)
        {
            this.weakened = 1;
            let message = {
                speech: ['^П-послушай...^', 'Ты, вижу, мастер карандаша и всё такое...', 'Н-но я не ^груша для битья^, а живое существо.', 'П-просто дождись, когда сбросится ставка на Промотке...&0', '...Затем поставь свой мульт за один карандаш, и мы мирно разойдёмся.', 'Ты ведь за этим пришёл?'],
                actions: [
                    () => new StakeAction(this),
                ]
            }
            
            this.bet = 3;

            if(!this.betShown)
            {
                this.betShown = true;
                return message;
            }

            delete message.actions;
            return message;
        }

        if(_damage > 5)
        {
            this.actualHurt++;
            
            if(this.weakened == 0 && this.call == 0 && this.mockery >= 2 && this.actualHurt == 1)
            {
                return {
                    speech: ['У тебя получилось!!', 'Только не размахивай этой штукой ТАК сильно...', '#7^БОЛЬНО ЖЕ!^']  
                };
            }
            
            if(this.drawAttempt == 0)
            {
                this.drawAttempt = 1;
    
                return {
                    speech: ['Атакуешь своими рисуночками, значит?', 'А я тоже так могу!&0'],
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
                    return {};

                this.mockAnnoyed = true;
                return {
                    speech: ['Ты это специально делаешь?!']
                };
            }

            switch(this.mockery)
            {
                case 1:
                    return {
                        speech: ['#1О боже! Какая ужасная атака! ^ПОЩАДИ МЕНЯ!!!^*', '#2* Сарказм.']
                    };

                case 2:
                    return {
                        speech: ['Ты ОПЯТЬ?! Не позорься!']
                    };

                case 3:
                    return {
                        speech: ['Может, объяснить тебе, что надо делать?...']
                    };

                case 4:
                    return {
                        speech: ['Просто СРИСУЙ заклинание своим карандашом!!', 'И не отпускай его, пока не закончишь.']  
                    };

                default:
                    return {
                        speech: ['#7...']  
                    };
            }
        }

        return {};
    }
    
    Drawn(_len)
    {
        this.drawn++;
        
        let result = {text: ['Время ставки немного понижается!']};
        let delta = 1;
        
        if(_len >= 50)
        {
            delta = 3;
            result.text = ['Время ставки сильно понижается!!!'];
        }
        else if(_len >= 25)
        {
            delta = 2;
            result.text = ['Время ставки понижается!!'];
        }

        if(this.drawn == 1)
            result.speech = ['#8ЭТО ЧТО ТАКОЕ?!?!?'];

        this.DecreaseResetCounter(delta);

        return result;
    }

    DecreaseResetCounter(_delta)
    {
        this.resetCounter -= _delta;
        if(this.resetCounter <= 0)
        {
            alert('ВАУ!');
        }
    }

    AttackEnd()
    {
        this.DecreaseResetCounter(1);
        
        if(this.failedAttack == 1)
            this.failedAttack = 2;
        else if(this.failedAttack == 2)
            this.failedAttack = 0;

        if(this.drawAttempt == 2)
        {
            this.drawAttempt = 3;

            return {
                speech: ['#3.....', '#3..................', '#4Карандаш плохой попался.'],
            };
        }

        if(this.weakened == 1)
            this.weakened = 2;
        else if(this.weakened == 2)
            this.weakened = 3;

        if(this.hp / this.maxHP <= .5 && this.call < 1)
        {
            res.sfx.bgm.playbackRate = .8;
            this.call = 1;

            return {
                speech: ['#6...', '#6^(Н-нужна помощь...)^'],
            };
        }
        else if(this.call == 1)
        {
            this.call = 2;
        }
        else if(this.hp / this.maxHP <= .3 && this.call < 3)
        {
            this.call = 3;

            return {
                speech: ['#6^(Д-да где он...)^'],
            };
        }
        else if(this.call == 3)
        {
            this.call = 4;
        }
        
        return {};
    }

    Check()
    {
        this.check++;

        return {
            text: ['~ПромоУтка — АТК 10 ЗЩТ 0~Рекламный бизнесмен.%~Древесный сомелье.%~КРАСАВЧИК. *'],
            speech: ['#2* Выдержки из визитной карточки.~Могут не отражать действительное качество услуг.']
        };
    }
    Bet()
    {
        this.bet++;

        switch(this.bet)
        {
            case 1:
                this.betShown = true;
                return {
                    text: ['~Ты предлагаешь свой карандаш ПромоУтке.'],
                    speech: ['Один карандаш???? НЕ СМЕШИ, Я ЕГО ТОЛЬКО ПОГРЫЗТЬ МОГУ!', 'Короч, смотри...&0', '@2Триста тыщ@ карандашей против @2одного@ твоего. Сечёшь, почему это не сработает?'],
                    actions: [
                        () => new StakeAction(this)
                    ]
                };
                
            case 2:
                return {
                    text: ['~У тебя всё ещё один карандаш, но ты не сдаёшься.'],
                    speech: ['ТЫ ПОНИМАЕШЬ КАК РАБОТАЕТ АУКЦИОН??? ТВОИМ КАРАНДАШОМ ТОЛЬКО КАРАКУЛИ РИСОВАТЬ!!!', 'Не, ну ты конечно можешь ДОЖДАТЬСЯ @2сброса ставки@...', '...но я СИЛЬНО сомневаюсь, что твой твёрдо-мягкий друг переживёт все мои атаки!!!']
                };

            default:
                return {
                    text: ['~Похоже, стоит дождаться сброса ставки и только после этого предложить карандаш.']
                };
        }
    }
    Vandalize()
    {
        return {
            text: ['Нарисуй что угодно, чтобы ускорить сброс ставки!'],
            mode: DRAW
        }
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
        this.parent.sprite.SetAnimation(STATE_DRAW, 0);
    }
    GameLoop(_delta)
    {
        this.animationTimer -= 1 * _delta;
        this.parent.sprite.SetAnimation(STATE_DRAW, 1 - this.animationTimer / this.animationTime);
        
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