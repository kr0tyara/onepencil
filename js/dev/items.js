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

        this.name = loc.Get('items', 'nothing');
        this.index = {x: 0, y: 0};
        this.text = loc.Dial('items', 'nothing');
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

        this.name = loc.Get('items', 'sharpener');
        this.index = {x: 0, y: 0};
        this.text = loc.Dial('items', 'sharpener');
    }

    Consume()
    {
        if(battle.soul.eaten)
        {
            return {
                text: loc.Dial('items', 'sharpener_fail'),
            }
        }

        let result = super.Consume();

        switch(this.consumed)
        {
            case 2:
                result.text = loc.Dial('items', 'sharpener_1');
                break;
            case 3:
                result.text = loc.Dial('items', 'sharpener_2');
                break;
            case 4:
                result.text = loc.Dial('items', 'sharpener_3');
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

        this.name = loc.Get('items', 'rubber_band');
        this.index = {x: 1, y: 0};
        this.text = loc.Dial('items', 'rubber_band');
    }

    Consume()
    {
        if(battle.soul.eaten)
        {
            return {
                text: loc.Dial('items', 'rubber_band_fail')
            }
        }

        return super.Consume();
    }
}

class GhostCandy extends Item
{
    constructor()
    {
        super(1);

        this.hp = 0;
        this.maxConsume = 2;

        this.effect = EFFECT_INVINSIBILITY;
        this.effectTurns = 3;

        this.name = loc.Get('items', 'ghost_candy');
        this.index = {x: 0, y: 1};
        this.text = loc.Dial('items', 'ghost_candy');
    }
    
    Consume()
    {
        let result = super.Consume();

        switch(this.consumed)
        {
            case 1:
                result.text = loc.Dial('items', 'ghost_candy_1');
                break;
            case 2:
                result.text = loc.Dial('items', 'ghost_candy_2');
                break;
        }

        if(!battle.soul.eaten)
            result.text[0] += this.text[0];

        return result;
    }
}