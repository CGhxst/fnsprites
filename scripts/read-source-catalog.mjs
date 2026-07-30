import { readFile } from 'node:fs/promises';
import { parse } from 'acorn';

function readLiteral(node, location) {
    if (node?.type === 'Literal') return node.value;

    if (node?.type === 'ArrayExpression') {
        return node.elements.map((element, index) => {
            if (!element) throw new TypeError(`${location}[${index}] cannot be empty.`);
            return readLiteral(element, `${location}[${index}]`);
        });
    }

    if (node?.type === 'ObjectExpression') {
        return Object.fromEntries(node.properties.map(property => {
            if (
                property.type !== 'Property'
                || property.kind !== 'init'
                || property.computed
                || property.method
                || property.shorthand
            ) {
                throw new TypeError(`${location} contains an unsupported property.`);
            }
            const key = property.key.type === 'Identifier' ? property.key.name : property.key.value;
            if (typeof key !== 'string') throw new TypeError(`${location} contains an invalid key.`);
            return [key, readLiteral(property.value, `${location}.${key}`)];
        }));
    }

    throw new TypeError(`${location} must contain literal data only.`);
}

export function parseSourceCatalog(source) {
    const program = parse(source, { ecmaVersion: 'latest', sourceType: 'script' });

    for (const statement of program.body) {
        if (statement.type !== 'VariableDeclaration') continue;
        const declaration = statement.declarations.find(item =>
            item.id.type === 'Identifier' && item.id.name === 'baseSprites',
        );
        if (declaration) return readLiteral(declaration.init, 'baseSprites');
    }

    throw new TypeError('sprites-data.js must declare baseSprites.');
}

export async function readSourceCatalog(dataPath) {
    return parseSourceCatalog(await readFile(dataPath, 'utf8'));
}
