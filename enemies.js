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
        return this.attacks[_counter % this.attacks.length];
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

        this.expression = -1;

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
        this.expression = -1;
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
        if(this.state == STATE_DEAD)
            _ctx.globalAlpha = .05;

        if(this.state == STATE_ATTACKING)
            _ctx.globalAlpha = .5;
        
        this.Draw(_ctx, _dt);

        if(this.state == STATE_DEAD || this.state == STATE_ATTACKING)
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
        
        this.stakeShown = false;
    }

    Draw(_ctx, _dt)
    {
        // промотка
        if(this.stakeShown)
        {
            let y = 25;
            let h = battle.defaultBounds.y1 - 25 - 25;
            
            if(this.state == STATE_HANGING)
                y = -h + (h + 25) * this.animationTime;

            _ctx.lineCap = 'round';
            _ctx.lineJoin = 'round';
            
            _ctx.lineWidth = 5;
            _ctx.strokeStyle = '#000';
            _ctx.fillStyle = '#fff';

            _ctx.beginPath();
            Utils.RoundedRect(_ctx, battle.defaultBounds.x1, y, 250, h, 6);
            _ctx.fill();
            _ctx.stroke();
            _ctx.closePath();
            
            _ctx.drawImage(res.sprites.promote, 0, (this.state == STATE_ATTACKING || _dt % 500 < 250 ? 0 : 162), 244, 162, battle.defaultBounds.x1, y, 244, 162);

            _ctx.font = '48px Pangolin';
            _ctx.fillStyle = '#000';
    
            let text = `324905`;
            let w = _ctx.measureText(text).width;

            _ctx.textAlign = 'center';
            _ctx.textBaseline = 'bottom';

            _ctx.save();
            _ctx.translate(battle.defaultBounds.x1 + 250 / 2, y + h - 30);

            _ctx.fillText(text, 0, 0);
            _ctx.translate(w / 2 + 5, -16);
            _ctx.rotate(Math.PI * 1.5);
            _ctx.drawImage(res.sprites.soul, 0, 0);

            _ctx.restore();
            
            _ctx.font = '24px Pangolin';
            _ctx.fillText(`Осталось ${10 - battle.attackCounter} атак`, battle.defaultBounds.x1 + 250 / 2, y + h - 10);
        }

        let shake = 0;

        if(this.state == STATE_HURT)
            shake = Math.sin(_dt / 20) * (20 * this.animationTime);

        // утка
        let offset = 0;
        if(this.state == STATE_HURT)
            offset = 400;
        else if(this.state == STATE_HANGING || this.state == STATE_HELP)
            offset = 800;
        else if(this.state == STATE_DRAW)
            offset = this.animationTime < 1 && _dt % 500 < 250 ? 1600 : 2000;
        else if(this.expression != -1)
            offset = this.expression * 400;

        _ctx.drawImage(res.sprites.duck, offset, 0, 400, 400, this.x + shake, this.y, this.w, this.h);

        if(this.state == STATE_DRAW)
        {
            if(this.animationTime >= .3)
            {
                let t = (this.animationTime - .3) / (.6 - .3);
                if(t > 1)
                    t = 1;

                let k = this.y + 140 + 150;
                let h = 120 * t;
                let y = k - 25 * t - h;

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

        this.attacks = [CardAttack, ThrowAttack, MouthAttack, BallAttack];
        
        this.actions = [
            {name: 'Проверка', index: {x: 0, y: 0}, action: this.Check.bind(this)},
            {name: 'Ставка', index: {x: 0, y: 1}, action: this.Bet.bind(this)},
            {name: 'На помощь', index: {x: 1, y: 0}, action: this.Scream.bind(this)},
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

        this.scream = 0;
        this.bet = 0;
        this.check = 0;

        this.hurt = 0;
        this.actualHurt = 0;
        this.mockery = 0;
        this.failedAttack = 0;
        this.mockAnnoyed = false;

        this.drawAttempt = 0;

        this.call = 0;
    }

    GetAttack(_counter)
    {
        if(this.drawAttempt == 1)
            return ScribbleAttack;

        return super.GetAttack(_counter);
    }

    Idle()
    {
        if(this.failedAttack == 2)
            return {
                text: ['~(Перерисуй заклинание по шаблону, не отпуская курсор, чтобы атаковать!)']
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

        if(this.call == 0)
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
            this.actualHurt++;
            
            if(this.call == 0 && this.mockery >= 2 && this.actualHurt == 1)
            {
                return {
                    speech: ['У тебя получилось!!', 'Только не размахивай этой штукой ТАК сильно...~^БОЛЬНО ЖЕ!^']  
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
        else if(this.call == 0)
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
                        speech: ['О боже! Какая ужасная атака! ^ПОЩАДИ МЕНЯ!!!^*', '#3* Это шутка.']
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

                case 5:
                    return {
                        speech: ['...']  
                    };

                default:
                    return {};
            }
        }

        return {};
    }

    AttackEnd()
    {
        if(this.failedAttack == 1)
            this.failedAttack = 2;
        else if(this.failedAttack == 2)
            this.failedAttack = 0;

        if(this.drawAttempt == 1)
        {
            this.drawAttempt = 2;

            return {
                speech: ['...', '.....', 'А! Карандаш плохой просто.'],
            };
        }

        if(this.hp / this.maxHP <= .6 && this.call < 1)
        {
            this.call = 1;

            return {
                speech: ['...&0', '^(Н-нужна помощь...)^'],
                actions: [
                    () => new CallHelpAction(this)
                ]
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
                speech: ['^(Д-да где он...)^'],
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
            speech: ['#3* Не является рекламой.']
        };
    }
    Bet()
    {
        this.bet++;

        switch(this.bet)
        {
            case 1:
                return {
                    text: ['~Ты предлагаешь свою ставку.'],
                    speech: ['Один карандаш???? НЕ СМЕШИ, Я ЕГО ТОЛЬКО ПОГРЫЗТЬ МОГУ!', 'Короч, смотри...&0', '@2Триста тыщ@ карандашей против @2одного@ твоего. Сечёшь?'],
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

    Scream()
    {
        this.scream++;

        switch(this.scream)
        {
            case 1:
                return {
                    text: ['~Ты позвал Туни...', '~Но никто не пришёл.']
                };

            case 2:
                return {
                    text: ['~Ты позвал Родю...', '~Но никто не пришёл.']
                };

            case 3:
                return {
                    text: ['~Ты позвал Нарушителя...', '~Но никто не пришёл.']
                };

            case 4:
                return {
                    text: ['~Ты позвал ПромоУтку...'],
                    speech: ['Моя харизма ослепила тебя???% Такое УЖЕ СЛУЧАЛОСЬ *', '#3* Такого не случалось.'],
                };

            default:
                return {
                    text: ['~Тебе больше некого позвать.', '~ Может, попробовать сделать что-то ещё?...']
                };
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

class CallHelpAction extends TriggerAction
{
    constructor(_parent)
    {
        super(_parent);
        
        this.animationTime = 100;
        this.animationTimer = this.animationTime;
    }

    Start()
    {
        this.parent.sprite.SetAnimation(STATE_HELP, 0);
    }
    GameLoop(_delta)
    {
        this.animationTimer -= 1 * _delta;
        this.parent.sprite.SetAnimation(STATE_HELP, 1 - this.animationTimer / this.animationTime);
        
        if(this.animationTimer <= 0)
            this.Finish();
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