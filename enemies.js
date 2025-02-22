/*
    * - новый абзац
    % - задержка текста
    &n - триггер actions 
    @n - цвет
    ^ - тряска
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
        let attackClass = this.attacks[_counter % this.attacks.length];
        return new attackClass(this.sprite);
    }

    Die()
    {
        this.alive = false;
        this.sprite.SetAnimation(STATE_DEAD, 0);
    }

    Idle()
    {
        return {
            text: ['*Где я?']
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
            text: ['*Никто - АТК 1000 ЗЩТ -999.*Я ем любовь.'],
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

        this.speaking = false;
        this.speechBubble = new SpeechBubble(this);
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
        
        let spr = [
            './img/duck.png',
            './img/promote.png',
        ];

        this.sprites = [];
        for(let i in spr)
        {
            let img = new Image();
            img.src = spr[i];
            this.sprites.push(img);
        }

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
            _ctx.rect(battle.defaultBounds.x1, y, 250, h);
            _ctx.fill();
            _ctx.stroke();
            _ctx.closePath();
            
            _ctx.drawImage(this.sprites[1], 0, (this.state == STATE_ATTACKING || _dt % 500 < 250 ? 0 : 162), 244, 162, battle.defaultBounds.x1, y, 244, 162);

            _ctx.font = '48px Arial';
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
            _ctx.drawImage(battle.soul.sprite, 0, 0);

            _ctx.restore();
            
            _ctx.font = '24px Arial';
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

        _ctx.drawImage(this.sprites[0], offset, 0, 400, 400, this.x + shake, this.y, this.w, this.h);
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

        this.attacks = [CardAttack];
        
        this.actions = [
            {name: 'Проверка', index: {x: 0, y: 0}, action: this.Check.bind(this)},
            {name: 'Ставка', index: {x: 0, y: 1}, action: this.Bet.bind(this)},
            {name: 'На помощь', index: {x: 1, y: 0}, action: this.Scream.bind(this)},
        ];
        
        this.flavourText = [
            '*ПромоУтка чистит пёрышки.%*Залысину видно за километр.',
            '*9 из 36 538 Тунеров рекомендуют!',
            '*Пахнет грифелем.',
            '*ПромоУтка считает свою прибыль.%*Для этого не нужен калькулятор.',
            '*ПромоУтка ковыряется в зубах.*Но, скорее, просто грызёт зубочистку...',
        ];
        this.dangerFlavourText = [
            '*ПромоУтка нервно глядит по сторонам.',
            '*С ПромоУтки слетают перья.',
            '*ПромоУтка... молится???%%%*...послышалось.',
            '*Пахнет мокрыми наггетсами и опилками.',
            '*ПромоУтка отменяет все встречи.%*Даже на следующий год.',
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

        this.call = 0;
    }

    Idle()
    {
        if(this.call == 1)
        {
            return {
                text: ['*ПромоУтка вызвал подкрепление.']
            }
        }
        else if(this.call == 3)
        {
            return {
                text: ['*Подкрепление задерживается.']
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
    AttackEnd()
    {
        if(this.hp / this.maxHP <= .8 && this.call < 1)
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
        else if(this.hp / this.maxHP <= .6 && this.call < 3)
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
        return {
            text: ['*ПромоУтка — АТК 10 ЗЩТ 0*Рекламный бизнесмен.%*Древесный сомелье.%*КРАСАВЧИК.'],
            speech: ['О дааааа!!! Это всё ПРАВДА. %ОСОБЕННО ПОСЛЕДНЕЕ!!'],
            actions: [
                () => new StakeAction(this)
            ]
        };
    }
    Bet()
    {
        this.bet++;

        switch(this.bet)
        {
            case 1:
                return {
                    text: ['*Ты предлагаешь свою ставку.'],
                    speech: ['Один карандаш???*Я ЕГО РАЗВЕ ЧТО ПОГРЫЗТЬ МОГУ!!!!']
                };
                
            case 2:
                return {
                    text: ['*У тебя всё ещё один карандаш, но ты не сдаёшься.'],
                    speech: ['ОДИН карандаш... А ставка 324905!!! ПОНИМАЕШЬ???']
                };

            case 3:
                return {
                    text: ['*Ты третий раз предлагаешь свой карандаш.'],
                    speech: ['ХВАТИТ ТЫКАТЬ СВОЙ КАРАНДАШ МНЕ В ЛИЦО!!!', '...%Значит ТАК.&0', 'ЭТО - ПРОМОТКА. Видишь??!*%...тут таймер, когда ставка сбросится.', 'ЖДИ!!! Если выживешь,% ТО МЕСТО ТВОЁ!!!!'],
                    actions: [
                        () => new StakeAction(this)
                    ]
                };

            default:
                return {
                    text: ['*Похоже, единственный способ — дождаться сброса ставки и только после этого предложить карандаш.']
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
                    text: ['*Ты позвал Туни...', '*Но никто не пришёл.']
                };

            case 2:
                return {
                    text: ['*Ты позвал Родю...', '*Но никто не пришёл.']
                };

            case 3:
                return {
                    text: ['*Ты позвал Нарушителя...', '*Но никто не пришёл.']
                };

            case 4:
                return {
                    text: ['*Ты позвал ПромоУтку...'],
                    speech: ['Моя харизма ослепила тебя???% Такое УЖЕ СЛУЧАЛОСЬ.'],
                };

            default:
                return {
                    text: ['*Тебе больше некого позвать.', '* Может, попробовать сделать что-то ещё?...']
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

    Finish()
    {
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