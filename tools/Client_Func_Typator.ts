/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
*/

export interface FunctionMetadata {
    name: string;
    parameters: ParameterMetadata[];
    returnType: string;
    filePath: string;
}

export interface ParameterMetadata {
    name: string;
    type: string;
    optional: boolean;
}

export interface FileMetadata {
    fileName: string;
    functions: FunctionMetadata[];
}

import ts from 'typescript';
import path from 'path';

import { writeFileSync } from 'fs';
import logger from '../src/core/logger.js';

export class FunctionAnalyzer {
    private program: ts.Program;
    private typeChecker: ts.TypeChecker;
    private importedTypes: Set<string> = new Set();
    private importStatements: Map<string, Set<string>> = new Map();

    constructor(private rootDir: string) {
        const configPath = ts.findConfigFile(
            rootDir,
            ts.sys.fileExists,
            'tsconfig.json'
        );

        if (!configPath) {
            throw new Error("Could not find a valid 'tsconfig.json'.");
        }

        const { config } = ts.readConfigFile(configPath, ts.sys.readFile);
        const { options, fileNames } = ts.parseJsonConfigFileContent(
            config,
            ts.sys,
            path.dirname(configPath)
        );

        this.program = ts.createProgram(fileNames, options);
        this.typeChecker = this.program.getTypeChecker();
    }

    public analyzeFunctions(): FileMetadata[] {
        const sourceFiles = this.program.getSourceFiles()
            .filter(sourceFile =>
                !sourceFile.fileName.includes('node_modules') &&
                sourceFile.fileName.startsWith(this.rootDir)
            );

        return sourceFiles.map(sourceFile => this.analyzeSourceFile(sourceFile));
    }

    private isNodeExported(node: ts.FunctionDeclaration | ts.MethodDeclaration): boolean {
        const modifiers = ts.getModifiers(node);
        if (!modifiers) return false;

        return modifiers.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword);
    }

    private analyzeSourceFile(sourceFile: ts.SourceFile): FileMetadata {
        const functions: FunctionMetadata[] = [];

        const visit = (node: ts.Node) => {
            if (ts.isFunctionDeclaration(node)) {
                const functionMetadata = this.analyzeFunctionNode(node);
                if (functionMetadata) {
                    functions.push(functionMetadata);
                }
            }

            if (ts.isExportDeclaration(node)) {
                if (node.exportClause && ts.isNamedExports(node.exportClause)) {
                    node.exportClause.elements.forEach(element => {
                        const symbol = this.typeChecker.getSymbolAtLocation(element.name);
                        if (symbol) {
                            const declarations = symbol.declarations;
                            if (declarations && declarations.length > 0) {
                                const decl = declarations[0];
                                if (ts.isFunctionDeclaration(decl)) {
                                    const functionMetadata = this.analyzeFunctionNode(decl);
                                    if (functionMetadata) {
                                        functions.push(functionMetadata);
                                    }
                                }
                            }
                        }
                    });
                }
            }

            ts.forEachChild(node, visit);
        };

        ts.forEachChild(sourceFile, visit);

        return {
            fileName: path.relative(this.rootDir, sourceFile.fileName),
            functions
        };
    }

    private collectImportsFromType(typeNode: ts.TypeNode | ts.Node, sourceFile: ts.SourceFile) {
        const visit = (node: ts.Node) => {
            if (ts.isTypeReferenceNode(node)) {
                const symbol = this.typeChecker.getSymbolAtLocation(node.typeName);
                if (symbol && symbol.declarations && symbol.declarations.length > 0) {
                    const declaration = symbol.declarations[0];
                    const declarationSourceFile = declaration.getSourceFile();

                    if (declarationSourceFile.fileName !== sourceFile.fileName) {
                        const importPath = this.getRelativeImportPath(sourceFile.fileName, declarationSourceFile.fileName);
                        if (importPath) {
                            if (!this.importStatements.has(importPath)) {
                                this.importStatements.set(importPath, new Set());
                            }
                            this.importStatements.get(importPath)!.add(symbol.name);
                            this.importedTypes.add(symbol.name);
                        }
                    }
                }
            }
            ts.forEachChild(node, visit);
        };

        visit(typeNode);
    }

    private collectParameterImports(parameters: ParameterMetadata[], fileName: string): void {
        const sourceFile = this.program.getSourceFile(fileName);
        if (!sourceFile) return;

        for (const param of parameters) {
            // Find type references in the source file that match our parameter type
            const visit = (node: ts.Node) => {
                if (ts.isTypeReferenceNode(node) && node.getText() === param.type) {
                    this.collectImportsFromType(node, sourceFile);
                }
                ts.forEachChild(node, visit);
            };

            ts.forEachChild(sourceFile, visit);
        }
    }

    private analyzeFunctionNode(node: ts.FunctionDeclaration | ts.MethodDeclaration): FunctionMetadata | null {
        if (!this.isNodeExported(node)) {
            return null;
        }

        if (!node.name) return null;

        const signature = this.typeChecker.getSignatureFromDeclaration(node);
        if (!signature) return null;

        const parameters: ParameterMetadata[] = node.parameters.map(param => {
            const paramType = param.type
                ? this.getFullTypeText(param.type)
                : 'any';

            if (param.type) {
                this.collectImportsFromType(param.type, node.getSourceFile());
            }

            return {
                name: param.name.getText(),
                type: paramType,
                optional: !!param.questionToken
            };
        });

        const returnType = node.type
            ? this.getFullTypeText(node.type)
            : 'any';

        if (node.type) {
            this.collectImportsFromType(node.type, node.getSourceFile());
        }

        return {
            name: node.name.getText(),
            parameters,
            returnType,
            filePath: node.getSourceFile().fileName
        };
    }

    private getFullTypeText(typeNode: ts.TypeNode): string {
        const fullText = typeNode.getText();

        if (fullText.includes('...')) {
            return this.typeChecker.typeToString(
                this.typeChecker.getTypeFromTypeNode(typeNode),
                undefined,
                ts.TypeFormatFlags.NoTruncation |
                ts.TypeFormatFlags.WriteArrayAsGenericType |
                ts.TypeFormatFlags.MultilineObjectLiterals |
                ts.TypeFormatFlags.WriteClassExpressionAsTypeLiteral
            );
        }

        return fullText;
    }

    private getRelativeImportPath(fromPath: string, toPath: string): string | null {
        if (toPath.includes('node_modules')) {
            const nodeModulesIndex = toPath.indexOf('node_modules');
            return toPath.slice(nodeModulesIndex + 13).replace(/\\/g, '/').replace(/\.d\.ts$/, '').replace(/\.ts$/, '');
        }

        let relativePath = path.relative(path.dirname(fromPath), toPath)
            .replace(/\\/g, '/')
            .replace(/\.ts$/, '');

        if (!relativePath.startsWith('.')) {
            relativePath = './' + relativePath;
        }

        return relativePath;
    }


    public generateInterfaces(): string {
        const fileMetadata = this.analyzeFunctions();
        let output = '';

        // Generate imports
        this.importStatements.forEach((types, importPath) => {
            const typesList = Array.from(types).join(', ');
            output += `import type { ${typesList} } from '${importPath}';\n`;
        });
        output += '\n';

        const dirName = path.basename(this.rootDir);
        const namespaceName = this.formatNamespaceName(dirName);

        output += `declare namespace ${namespaceName} {\n`;

        for (const file of fileMetadata) {
            output += `\n  // From ${file.fileName}\n`;

            if (file.functions.length === 1) {
                const func = file.functions[0];
                this.collectParameterImports(func.parameters, file.fileName);
                const params = this.generateParameterList(func.parameters);
                if (params.length > 80) {
                    output += `  export function ${this.sanitizeIdentifier(file.fileName.split('.')[0])}(\n`;
                    func.parameters.forEach((param, index) => {
                        output += `    ${param.name}${param.optional ? '?' : ''}: ${param.type}${index < func.parameters.length - 1 ? ',' : ''}\n`;
                    });
                    output += `  ): ${func.returnType};\n`;
                } else {
                    output += `  export function ${this.sanitizeIdentifier(file.fileName.split('.')[0])}(${params}): ${func.returnType};\n`;
                }
            } else {
                const moduleNamespace = this.sanitizeIdentifier(path.basename(file.fileName, '.ts'));
                output += `  export namespace ${moduleNamespace} {\n`;

                for (const func of file.functions) {
                    this.collectParameterImports(func.parameters, file.fileName);
                    const params = this.generateParameterList(func.parameters);
                    if (params.length > 80) {
                        output += `    export function ${this.sanitizeIdentifier(func.name)}(\n`;
                        func.parameters.forEach((param, index) => {
                            output += `      ${param.name}${param.optional ? '?' : ''}: ${param.type}${index < func.parameters.length - 1 ? ',' : ''}\n`;
                        });
                        output += `    ): ${func.returnType};\n`;
                    } else {
                        output += `    export function ${this.sanitizeIdentifier(func.name)}(${params}): ${func.returnType};\n`;
                    }
                }

                output += `  }\n`;
            }
        }

        output += `}\n\n`;
        output += `export { ${namespaceName} };\n`;

        return output;
    }


    private sanitizeIdentifier(name: string): string {
        let sanitized = name.replace(/[^a-zA-Z0-9_]/g, '_');

        if (/^\d/.test(sanitized)) {
            sanitized = '_' + sanitized;
        }

        const reservedKeywords = new Set([
            'break', 'case', 'catch', 'class', 'const', 'continue',
            'debugger', 'default', 'delete', 'do', 'else', 'enum',
            'export', 'extends', 'false', 'finally', 'for', 'function',
            'if', 'import', 'in', 'instanceof', 'new', 'null', 'return',
            'super', 'switch', 'this', 'throw', 'true', 'try', 'typeof',
            'var', 'void', 'while', 'with', 'implements', 'interface',
            'let', 'package', 'private', 'protected', 'public', 'static',
            'yield', 'any', 'boolean', 'symbol'
        ]);

        if (reservedKeywords.has(sanitized)) {
            sanitized = '_' + sanitized;
        }

        return sanitized;
    }

    private generateParameterList(parameters: ParameterMetadata[]): string {
        return parameters
            .map(param =>
                `${param.name}${param.optional ? '?' : ''}: ${param.type}`
            )
            .join(', ');
    }

    private formatNamespaceName(name: string): string {
        return "Client_" + name
            .split(/[-_]/)
            .map(part => part.charAt(0).toUpperCase() + part.slice(1))
            .join('');
    }
}

export function generateFunctionInterfaces(
    sourceDir: string,
    outputPath: string
): void {
    const analyzer = new FunctionAnalyzer(sourceDir);
    const interfaces = analyzer.generateInterfaces();

    writeFileSync(outputPath, interfaces, 'utf-8');
    logger.log(`Generated interfaces written to ${outputPath}`);
}

generateFunctionInterfaces(
    path.join(process.cwd(), "src", "core", "functions"),
    './types/client_functions.d.ts'
);