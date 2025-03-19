const   EFFECT_NONE = 0,
        EFFECT_DRAWING_TIME = 1;

class Item
{
    constructor(_id)
    {
        this.id = _id;

        this.hp = -1;
        this.consumed = 0;
        this.maxConsume = 1;

        this.effect = EFFECT_NONE;
        this.effectTurns = 0;

        this.name = 'Ничего';
        this.index = {x: 0, y: 0};
        this.text = ['Ты съел... э-э-э...~Ты что-то съел?~Мне плохо.'];
    }

    Consume()
    {
        this.consumed++;
        
        if(this.hp > 0)
        {
            battle.hp = Math.min(battle.hp + this.hp, battle.maxHP);
            res.sfx.heal.play();
        }
        else if(this.effect != EFFECT_NONE)
        {           
            battle.AddEffect(this.effect, this.effectTurns);
            res.sfx.effect.play();
        }
        
        
        let result = {text: this.text};
        result.speech = battle.enemies[0].StoryFlow();

        return result;
    }

    IsAvailable()
    {
        return this.consumed < this.maxConsume;
    }
}

class Sharpener extends Item
{
    constructor()
    {
        super(0);

        this.hp = 7;
        this.maxConsume = 4;

        this.name = 'Точилка';
        this.index = {x: 0, y: 0};
        this.text = ['Ты точишь карандаш.~Восстановлено @47 прочности@!'];
    }

    Consume()
    {
        let result = super.Consume();

        switch(this.consumed)
        {
            case 2:
                result.text = [this.text[0] + '~У точилки отклеились глазки.'];
                break;
            case 3:
                result.text = [this.text[0] + '~Точилка трещит по швам.'];
                break;
            case 4:
                result.text = [this.text[0] + '~@2Точилка сломалась.@'];
                break;
        }

        return result;
    }
}

class RubberBand extends Item
{
    constructor()
    {
        super(1);

        this.hp = 0;

        this.effect = EFFECT_DRAWING_TIME;
        this.effectTurns = 5;

        this.name = 'Резинка';
        this.index = {x: 1, y: 0};
        this.text = ['Ты обвязываешь резинку вокруг карандаша.~Следующие @45 ходов@ ты сможешь рисовать дольше!'];
    }
}