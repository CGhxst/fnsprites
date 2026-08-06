function idSet(values) {
    return new Set(Array.isArray(values) || values instanceof Set ? values : []);
}

export function compareCollections(yourOwned, theirOwned, releasedSprites) {
    const yours = idSet(yourOwned);
    const theirs = idSet(theirOwned);
    const youCanOffer = [];
    const theyCanOffer = [];

    for (const sprite of releasedSprites) {
        if (yours.has(sprite.id) && !theirs.has(sprite.id)) youCanOffer.push(sprite.id);
        if (theirs.has(sprite.id) && !yours.has(sprite.id)) theyCanOffer.push(sprite.id);
    }

    return { youCanOffer, theyCanOffer };
}
