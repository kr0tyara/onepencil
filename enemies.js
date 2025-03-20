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

        this.deltaTime = 80;
        this.deltaStickTime = 40;
        this.deltas = [];

        this.positionLocked = false;
        
        this.vandalismCanvas = document.createElement('canvas');
        this.vandalismCanvas.width = 360;
        this.vandalismCanvas.height = 305;
        this.vandalismCtx = this.vandalismCanvas.getContext('2d');
        this.vandalismCtx.imageSmoothingEnabled = false;
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

        // промотка
        if(this.stakeShown)
        {
            let x = battle.defaultBounds.x1;
            let y = 25;
            let h = battle.defaultBounds.y1 - 25 - 25;
            
            if(this.state == STATE_HANGING)
                y = -h + (h + 25) * this.animationTime;

            _ctx.lineCap = _ctx.lineJoin = 'round';
            
            _ctx.lineWidth = 6;
            _ctx.strokeStyle = '#000';
            _ctx.fillStyle = '#fff';

            _ctx.save();
            _ctx.beginPath();
            Utils.RoundedRect(_ctx, x, y, 250, h, 6);
            _ctx.fill();
            _ctx.clip();

            _ctx.fillStyle = '#edeef0';
            _ctx.fillRect(x, y, 250, 45);

            _ctx.font = '24px Pangolin';
            _ctx.fillStyle = '#000';
            _ctx.textAlign = 'center';
            _ctx.textBaseline = 'top';

            // заголовок
            let txt = 'Промотка';
            let w = _ctx.measureText(txt).width;
            _ctx.drawImage(res.sprites.ducky, x + (250 - w) / 2 - 12 - 6, y + 10);
            _ctx.fillText(txt, x + 250 / 2 + 16, y + 8 + 4);

            // мульт
            res.sheets.promo1.Draw(_ctx, 'promo1', Utils.GetAnimationFrame(_dt, 200, res.sheets.promo1.GetTagFrames('idle')), x, y + 45);

            // цена
            _ctx.fillStyle = '#edeef0';
            _ctx.fillRect(x, y + h - 80, 250, 80);
            if(this.enemy.resetCounter > 0)
            {
                _ctx.fillStyle = '#000';
                _ctx.font = '36px Pangolin';
                txt = `324905`;
                w = _ctx.measureText(txt).width;
                _ctx.textBaseline = 'bottom';

                _ctx.drawImage(res.sprites.minipencil, x + 250 / 2 + w / 2 + 5 - 12, y + h - 70);
                _ctx.fillText(txt, x + 250 / 2 - 16, y + h - 35);

                _ctx.textAlign = 'left';
                _ctx.font = '24px Pangolin';

                txt = `До сброса:`;
                w = _ctx.measureText(txt).width + 40;
                _ctx.fillText(txt, x + 40, y + h - 10);
                
                txt = ` ${this.enemy.resetCounter} м.`;
                _ctx.fillStyle = TEXT_COLORS[2];
                _ctx.fillText(txt, x + w, y + h - 10);
                w += _ctx.measureText(txt).width;
            }

            _ctx.stroke();
            _ctx.closePath();
            _ctx.restore();

            // вандализм
            _ctx.drawImage(this.vandalismCanvas, x - 55, y - 25);

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
                _ctx.fillText(`-${this.deltas[i].delta}`, x + w + 5, y + h - 10 - t * 25);
                _ctx.globalAlpha = 1;
            }

            if(this.enemy.resetCounter == 0)
            {
                _ctx.fillStyle = '#000';
                _ctx.beginPath();
                Utils.RoundedRect(_ctx, x, y + h - 80, 250, 80, 6);
                _ctx.fill();
                _ctx.closePath();

                _ctx.fillStyle = '#fff';
                _ctx.font = '46px Pangolin';
                _ctx.textAlign = 'center';
                _ctx.textBaseline = 'middle';
                _ctx.fillText('СВОБОДНО', x + 250 / 2, y + h - 70 / 2);
            }
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

                case '2':
                    headWobble.x = 0;
                    headWobble.y = 0;
                    break;
            }

            res.sheets.duck.Draw(_ctx, 'shadow', 0, this.x, this.y);
            res.sheets.duck.Draw(_ctx, 'arm_back', this.expression == 'E' ? 4 : this.expression == 'B' ? 3 : harmed ? 2 : this.expression == '4' ? 1 : 0, this.x + armWobble.x, this.y + armWobble.y);
            res.sheets.duck.Draw(_ctx, 'feet', harmed ? 2 : 0, this.x, this.y);

            if(this.expression != '2')
                res.sheets.duck.Draw(_ctx, 'hair', harmed ? 1 : 0, this.x + hairOffset.x + headWobble.x, this.y + hairOffset.y + headWobble.y);

            res.sheets.duck.Draw(_ctx, 'body', harmed ? 2 : 0, this.x + bodyWobble.x, this.y + bodyWobble.y);

            if(this.expression != '6')
                res.sheets.duck.Draw(_ctx, 'arm_front', this.expression == 'C' ? 4 : this.expression == 'B' ? 3 : harmed ? 2 : 0, this.x + armWobble.x, this.y + armWobble.y);

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

        this.attacks = [CardAttack, ThrowAttack, MouthAttack, BallAttack, HandsAttack];
        
        this.actions = [
            {name: 'Проверка', index: {x: 0, y: 0}, action: this.Check.bind(this)},
            {name: 'Ставка', index: {x: 1, y: 0}, action: this.Bet.bind(this)},
            {name: 'Вандализм', index: {x: 0, y: 1}, action: this.Vandalize.bind(this)},
            /*{name: 'Ничего', index: {x: 1, y: 1}, action: this.Nothing.bind(this)},*/
        ];
        
        this.flavourText = [
            '~ПромоУтка чистит пёрышки.%~Залысину видно за километр.',
            '~9 из 36 538 Тунеров рекомендуют!',
            '~Пахнет грифелем.',
            '~ПромоУтка считает свою прибыль.%~В уме.',
            '~ПромоУтка ковыряется в зубах.~Или, скорее, просто грызёт зубочистку...',
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

        this.resetCounter = 45;
        this.resetTalk = 0;

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
        this.call = 0;

        this.drawn = 0;
        this.wtf = 0;
        this.dontEvenThink = 0;
    }

    GetAttack()
    {
        if(this.drawAttempt == 2)
            return {
                attackClass: ScribbleAttack,
                difficulty: 1
            };

        if(this.resetCounter <= 0)
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
                speech: ['^П-послушай...^', 'Ты, вижу, мастер карандаша и всё такое...', 'Н-но я не ^груша для битья^, а живое существо.', 'П-просто дождись, когда сбросится ставка на Промотке, поставь свой несчастный карандаш, и мы мирно разойдёмся.', 'Т-ты ведь здесь для этого?'],
            }
            
            this.bet = 3;
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
                    return {
                        speech: this.StoryFlow()
                    };

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

                case 5:
                    return {
                        speech: ['#7...']  
                    };
            }
        }

        return {
            speech: this.StoryFlow()
        };
    }
    
    Drawn(_len)
    {
        this.drawn++;
        
        let result = {text: ['...ничего не произошло.~(Постарайся нарисовать как можно больше, не отпуская карандаш!)']};
        let delta = 0;
        
        if(_len >= 100)
        {
            delta = 5;
            result.text = ['Время ставки @2ОЧЕНЬ СИЛЬНО понижается@!!!'];
        }
        else if(_len >= 50)
        {
            delta = 3;
            result.text = ['Время ставки @2сильно понижается@!!!'];
        }
        else if(_len >= 25)
        {
            delta = 2;
            result.text = ['Время ставки @2понижается@!!'];
        }
        else if(_len >= 5)
        {
            delta = 1;
            result.text = ['Время ставки @2немного понижается@!'];
        }

        this.DecreaseResetCounter(delta);

        if(delta == 0)
        {
            if(this.dontEvenThink == 0 && this.wtf < 3)
            {
                this.dontEvenThink = 1;
                result.speech = ['#8Даже и не думай!'];
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

        if(this.resetCounter <= 0)
        {
            this.resetTalk++;

            switch(this.resetTalk)
            {
                case 1:
                    return ['Что там у нас по времени...', 'О! Пора сбрасывать.', 'Покупателей, вижу, не намечается...~Ну, значит, тебе везёт!', 'Можешь перекупить место хоть за свой карандаш.'];

                case 2:
                    return ['Что же ты медлишь??~Уже не хочешь покупать?'];

                case 3:
                    return ['#A^Хоть понимаешь, сколько моего времени ушло впустую из-за тебя^?!', 'Время - деньги, малой.~Вместо того, чтобы с тобой драться, я мог заработать..........', '#3.%.%.', 'Впрочем, неважно. Подписывай договор и уходи!'];

                case 4:
                    return ['#E$Хи-хи! Я принесу карандаш и буду тыкать им в лицо дядюшке ПромоУтке, и он мне ничего не сделает!!$', 'Это ты.', '#A^ПОЧЕМУ ТЫ ХИХИКАЕШЬ??!?!^'];

                case 10:
                    return ['Ты получаешь от моих мучений какое-то удовольствие или что?', 'То, что я не могу тебя выгнать*, не значит, что я твой личный шут.', '#2* Туни запрещает мне прогонять клиентов после того случая.'];

                default:
                    return ['#7Делай. Ставку.'];
            }
        }

        if(this.wtf < 1)
            return result;

        this.story++;
        switch(this.story)
        {
            case 1:
                return ['#8ЭТО ЧТО ТАКОЕ?!?!?'];

            case 2:
                return ['Буду ли я оттирать твою мазню?', 'Хороший вопрос.'];

            case 3:
                return ['И вот ответ...', '#9...%^МНОГО ЧЕСТИ!!!^*', '#2* Договор о Промотке не предусматривает страховку от возможного ущерба.'];

            case 4:
                return ['#BПока место приносит мне бабки, мне абсолютно всё равно.', '#BРазвлекайся!'];

            case 5: 
                return ['#1Что-что? ^Репутационные потери?^~Расскажешь всю правду ^своим друзьям^???', '#1.%.%.%', '#9^ТЕБЕ ВСЁ РАВНО НИКТО НЕ ПОВЕРИТ!!!^'];

            case 6:
                return ['У меня есть огромный козырь в отсутствующем рукаве.', 'Я даю людям надежду, что благодаря Промотке их творчество хоть кто-нибудь, да увидит.'];
            
            case 7: 
                return ['И пока они в это верят, они будут нести мне свои Карандаши.', 'Ты в том числе.'];

            case 8:
                if(this.weakened > 0)
                    return ['Если, конечно, ты здесь не за ^моей смертью^.'];
                break;
        }

        if(this.popsicle == 0 && this.weakened == 0 && this.call == 0)
        {
            this.popsicle = 1;
            this.popsicleHP = battle.hp;
            return ['Надо же, ты ещё здесь.', 'Эт самое...~У меня кончаются идеи для атак.', '#CКак насчёт перерыва на мороженку?*', '#2* Мороженку есть буду я.'];
        }

        return null;
    }

    DecreaseResetCounter(_delta)
    {
        this.resetCounter -= _delta;
        if(this.resetCounter <= 0)
        {
            _delta += this.resetCounter;
            this.resetCounter = 0;
            
            this.actions[1].highlighted = true;
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

        if(this.drawAttempt == 2)
        {
            this.drawAttempt = 3;

            return {
                speech: ['#3.....', '#3..................', '#4Карандаш плохой попался.'],
            };
        }

        if(this.popsicle == 1)
        {
            this.popsicle = 2;

            if(battle.hp < this.popsicleHP)
            {
                return {
                    speech: ['#DНям-ням!'],
                };
            }

            return {
                speech: ['#DПалочкой обойдусь!']
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

        let result = {
            text: ['~ПромоУтка — владелец Промотки.~Древесный сомелье и просто красавчик. *'],
            speech: ['#2* Выдержки из визитной карточки.']
        };

        if(this.check > 1)
        {
            delete result.speech;
            result.text = ['~Промоутка — владелец Промотки.~Довольно жадный. %Имеет на удивление здоровые зубы. (у уток они вообще должны быть???)'];
            result.speech = this.StoryFlow();
        }

        return result;
    }
    Bet()
    {
        this.bet++;

        if(this.resetCounter <= 0)
        {
            return {
                text: ['~Подпиши договор, и ты выкупишь место на Промотке за карандаш.'],
                mode: DEAL
            }
        }

        switch(this.bet)
        {
            case 1:
                return {
                    text: ['~Ты предлагаешь свой карандаш ПромоУтке.'],
                    speech: ['#9Один карандаш????~НЕ СМЕШИ!!! Я ЕГО ТОЛЬКО ПОГРЫЗТЬ МОГУ!!!', 'Не, ну ты конечно можешь ДОЖДАТЬСЯ @2сброса ставки@...', '...но я СИЛЬНО сомневаюсь, что твой карандаш выдержит мои атаки!!!'],
                };
                
            case 2:
                return {
                    text: ['~У тебя всё ещё один карандаш, но ты не сдаёшься.'],
                    speech: ['Жди, когда закончится ставка, или уматывай за карандашами!*', '#2* Текущая ставка: 324905 Карандашей.~Минимальная ставка для перекупа: 324906 Карандашей.~У Вас Карандашей: 1. @1(недостаточно)@']
                };

            default:
                return {
                    text: ['~Похоже, стоит дождаться сброса ставки и только после этого предложить карандаш.'],
                    speech: this.StoryFlow(),
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