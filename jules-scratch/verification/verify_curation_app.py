import asyncio
from playwright.async_api import async_playwright, expect
import os

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        # Get the absolute path to the index.html file
        file_path = os.path.abspath('index.html')
        await page.goto(f'file://{file_path}')

        # Wait for the page to be ready by checking for a known element
        await expect(page.get_by_role("heading", name="Codies Curations")).to_be_visible()

        # 1. Select the "Studs" category
        await page.get_by_role("button", name="Studs").click()

        # 2. Select the "Barbell" from the palette
        # The items are divs inside the #jewelry-items container
        barbell_in_palette = page.locator("#jewelry-items > div[data-id='jwl3']")
        await barbell_in_palette.click()

        # 3. Place the barbell on the canvas
        canvas = page.locator("#piercing-canvas")
        await canvas.click(position={'x': 200, 'y': 200})

        # 4. Select the "Gem Stud" from the palette
        gem_in_palette = page.locator("#jewelry-items > div[data-id='jwl4']")
        await gem_in_palette.click()

        # 5. Place the gem stud
        await canvas.click(position={'x': 250, 'y': 250})

        # 6. Select the placed barbell again by clicking on it
        # This click needs to be on the same spot where the barbell was placed
        await canvas.click(position={'x': 200, 'y': 200})

        # 7. Verify the controls panel is visible
        await expect(page.locator("#jewelry-controls")).to_be_visible()

        # 8. Manipulate the barbell
        # Rotate it
        await page.locator("#rotation-slider").fill("45")
        # Change its length
        await page.locator("#length-slider").fill("100")
        # Change its thickness (size)
        await page.locator("#size-slider").fill("8")

        # 9. Take a screenshot for visual verification
        await page.screenshot(path="jules-scratch/verification/verification.png")

        await browser.close()

if __name__ == '__main__':
    asyncio.run(main())
