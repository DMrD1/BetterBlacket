import createPlugin from '#utils/createPlugin';
import axios from 'axios';

export default () => createPlugin({
    name: 'Extra Chat Utils',
    description: 'Adds extra options to the chat context menu (r-click), including join date tags.',
    authors: [{ name: 'DMrD', avatar: 'https://cdn.discordapp.com/avatars/830954336892485642/14e3f62b574dc6c829be7c62a13f601f?size=1024', url: 'https://discord.gg/yGcwFJsx' }],
    patches: [
        {
            file: '/lib/js/game.js',
            replacement: [
                {
                    match: /\$\{badges\}/,
                    replace: `
                        \${badges} 
                        \${(() => {
                            if (bb.plugins.settings['Extra Chat Utils']?.['Show Joined Tags (MAY CAUSE LAG!)'] && data.author.id) {
                                setTimeout(() => {
                                    $self.fetchJoinDate(data.author.id, data.message.id);
                                }, 0);
                                return '<span class="bb_joinedTag" id="join-tag-' + data.message.id + '">Loading...</span>';
                            }
                            return '';
                        })()}
                    `
                },
                {
                    // Match the context menu injection point
                    match: /\$\{blacket\.config\.path !== "trade" \? `<div class="styles__contextMenuItemContainer___m3Xa3-camelCase" id="message-context-quote">/,
                    replace: `
                        <div class="styles__contextMenuItemContainer___m3Xa3-camelCase" id="message-context-view-stats">
                            <div class="styles__contextMenuItemName___vj9a3-camelCase">View Stats</div>
                            <i class="styles__contextMenuItemIcon___2Zq3a-camelCase fa-sharp fa-solid fa-eyes"></i>
                        </div>

                        <div class="styles__contextMenuItemContainer___m3Xa3-camelCase" id="message-context-check-blooks">
                            <div class="styles__contextMenuItemName___vj9a3-camelCase">Check Blooks</div>
                            <i class="styles__contextMenuItemIcon___2Zq3a-camelCase fa-solid fa-square" style="transform: rotate(10deg);"></i>
                        </div>
                        
                        <div class="styles__contextMenuItemContainer___m3Xa3-camelCase" id="message-context-check-tokens">
                            <div class="styles__contextMenuItemName___vj9a3-camelCase">Check Tokens</div>
                            <i class="styles__contextMenuItemIcon___2Zq3a-camelCase fa-sharp-duotone fa-regular fa-coins"></i>
                        </div>

                        \${blacket.config.path !== "trade" ? \`<div class="styles__contextMenuItemContainer___m3Xa3-camelCase" id="message-context-quote">`
                },
                {
                    // Match the click event handlers
                    match: /\$\(`#message-context-copy-id`\)\.click\(\(\) => navigator\.clipboard\.writeText\(data\.message\.id\)\);/,
                    replace: `$(\`#message-context-copy-id\`).click(() => navigator.clipboard.writeText(data.message.id));
                              $(\`#message-context-view-stats\`).click(() => window.location.assign("https://blacket.org/stats?name=" + data.author.username));
                              $(\`#message-context-check-blooks\`).click(() => $self.checkBlooks(data.author.username));
                              $(\`#message-context-check-tokens\`).click(() => $self.checkTokens(data.author.username));`
                }
            ]
        }
    ],
    styles: `
        .bb_joinedTag {
            margin-left: 0.208vw;
            background: #2f2f2f;
            padding: 1px 8px;
            border-radius: 10px;
            font-size: 1vw;
            color: white;
        }
    `,
    settings: [
        {
            name: 'Show Joined Tags MAY CAUSE LAG',
            default: false
        }
    ],
    checkBlooks: (username) => {
        if (window.blacket.config.path != "blooks") {
            alert('This can only be run on the blooks page, sending you there');
            window.location.assign("https://blacket.org/blooks");
        } else if (!window.bb?.plugins?.active?.includes("Better Chat") || !window.bb?.plugins?.active?.includes("Blook Utilities")) {
            alert('Turn on the Better Chat plugin and Blook Utilities to use this!');
            window.location.assign("https://blacket.org/settings");
            return;
        } else {
            blacket.toggleChat();

            axios.get('/worker2/user/' + username).then((u) => {
                if (u.data.error) {
                    return new bb.Modal({
                        title: 'User not found.',
                        buttons: [{ text: 'Close' }]
                    });
                }

                const lock = (blook) => {
                    let element = document.getElementById(blook.replaceAll('\'', '_').replaceAll(' ', '-'));
                    if (!element) return;
                    element.children[0].classList.add('styles__lockedBlook___3oGaX-camelCase');
                    element.children[1].outerHTML = `<i class='fas fa-lock styles__blookLock___3Kgua-camelCase' aria-hidden='true'></i>`;
                };

                const unlock = (blook, qty, rarity) => {
                    let element = document.getElementById(blook.replaceAll('\'', '_').replaceAll(' ', '-'));
                    if (!element) return;
                    element.children[0].classList.remove('styles__lockedBlook___3oGaX-camelCase');
                    element.children[1].outerHTML = `<div class='styles__blookText___3AMdK-camelCase' style='background-color: ${blacket.rarities[rarity].color};'>${qty}</div>`;
                };

                let blooks = [...document.querySelectorAll('.styles__blookContainer___3JrKb-camelCase')].map(a => a.id);
                blooks.forEach(b => lock(b));

                let containers = [...document.querySelectorAll('.styles__setBlooks___3xamH-camelCase')];
                let miscList = containers[containers.length - 1];
                miscList.replaceChildren();

                let user = u.data.user;

                bb.plugins.blookutils = {
                    viewingSelf: false,
                    blooks: user.blooks
                };

                document.querySelector('#bb_userSelectUsername').innerText = `User: ${user.username}`;

                Object.entries(user.blooks).forEach(blook => {
                    if (packBlooks.includes(blook[0])) return unlock(blook[0], blook[1], blacket.blooks[blook[0]].rarity);
                    if (!blacket.blooks[blook[0]]) return;

                    let quantity;
                    if (blacket.rarities[blacket.blooks[blook[0]].rarity] && blacket.rarities[blacket.blooks[blook[0]].rarity].color === 'rainbow') {
                        quantity = `<div class='styles__blookText___3AMdK-camelCase' style='background-image: url('/content/rainbow.gif');'>${blook[1].toLocaleString()}</div>`;
                    } else {
                        quantity = `<div class='styles__blookText___3AMdK-camelCase' style='background-color: ${blacket.rarities[blacket.blooks[blook[0]].rarity].color};'>${blook[1].toLocaleString()}</div>`;
                    }

                    miscList.insertAdjacentHTML('beforeend', `
                        <div id='${blook[0].replaceAll(' ', '-').replaceAll('\'', '_')}' class='styles__blookContainer___3JrKb-camelCase' style='cursor: pointer' role='button' tabindex='0'>
                            <div class='styles__blookContainer___36LK2-camelCase styles__blook___bNr_t-camelCase'>
                                <img loading='lazy' src='${blacket.blooks[blook[0]].image}' draggable='false' class='styles__blook___1R6So-camelCase' />
                            </div>
                            ${quantity}
                        </div>
                    `);

                    document.getElementById(blook[0].replaceAll(' ', '-').replaceAll('\'', '_')).addEventListener('click', () => blacket.selectBlook(blook[0]));
                });
            });
        }
    },
    checkTokens: (username) => {
        axios.get('/worker2/user/' + username).then((response) => {
            if (response.data && response.data.user) {
                const user = response.data.user;
                new bb.Modal({
                    title: `<img src="${user.avatar}" alt="Avatar" style="width: 2.344vw; height: 2.695vw; vertical-align: middle; margin-right: 0.2vw; margin-bottom: 0.2vw;" />
                            <a href='/stats?name=${username}' style="color: ${user.color}; text-decoration: none; font-weight: bold;">${username}</a> 
                            has<br>${user.tokens.toLocaleString()} <img src="https://blacket.org/content/tokenIcon.webp" alt="Tokens" style="width: 1.563vw; height: 1.563vw;" />`,
                    buttons: [{ text: 'Close' }]
                });
            } else {
                new bb.Modal({ title: 'User Not Found', description: `Unable to fetch tokens for user: ${username}`, buttons: [{ text: 'Close' }] });
            }
        }).catch(error => {
            console.error('Error fetching tokens:', error);
            new bb.Modal({ title: 'Error', description: 'There was an error fetching the user\'s tokens. Please try again later.', buttons: [{ text: 'Close' }] });
        });
    },
    fetchJoinDate: (userId, messageId) => {
        axios.get('/worker2/user/' + userId)
            .then((response) => {
                const createdTimestamp = response.data.user ? response.data.user.created : null;
                if (createdTimestamp) {
                    const joinDate = new Date(createdTimestamp * 1000).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });
                    const joinTag = document.querySelector('#join-tag-' + messageId);
                    if (joinTag) {
                        joinTag.innerHTML = 'Joined: ' + joinDate;
                    }
                }
            })
            .catch((error) => {
                console.error('Error fetching user join date:', error);
            });
    }
});
